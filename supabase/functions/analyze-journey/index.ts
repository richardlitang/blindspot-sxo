// Supabase Edge Function: /analyze-journey
// Analyzes multi-step user journeys for friction points

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JourneyStep {
  step: number
  url: string
  title: string
  screenshot: string
}

interface AnalyzeJourneyRequest {
  steps: JourneyStep[]
}

function buildJourneyPrompt(steps: JourneyStep[]): string {
  const stepDescriptions = steps.map((s, i) => {
    let pathname = '/'
    try {
      pathname = new URL(s.url).pathname
    } catch {
      pathname = s.url
    }
    return `Image ${i + 1}: Step ${s.step} - "${s.title}" (${pathname})`
  }).join('\n')

  return `You are Blindspot, analyzing a USER JOURNEY consisting of ${steps.length} steps.

THE FLOW:
${stepDescriptions}

Your mission: Identify FRICTION POINTS in this user journey. Focus on:

1. **TRANSITION LOGIC**: Does each step flow naturally to the next?
   - Is the path to the next action obvious?
   - Are there confusing detours or dead ends?

2. **CONSISTENCY**: Does the experience feel cohesive?
   - Does the design language stay consistent?
   - Does the messaging/value prop carry through?
   - Do any pages look like they belong to a different site?

3. **FRICTION MOMENTS**: Where would users drop off?
   - Is there a step that's significantly harder than others?
   - Are there unexpected barriers (popups, forms, confusion)?
   - Where is the "I give up" moment?

4. **TRUST CONTINUITY**: Does trust build or break?
   - Are trust signals present at critical moments (checkout, signup)?
   - Does anything feel sketchy or inconsistent?

OUTPUT FORMAT (JSON only, no markdown):
{
  "grade": "C+",
  "summary": "One sentence about the overall flow quality.",
  "flowScore": {
    "clarity": 7,
    "consistency": 5,
    "friction": 6,
    "trustFlow": 8
  },
  "dropOffRisk": "Step 2 - Pricing page has the highest drop-off risk because...",
  "roasts": [
    {
      "step": 2,
      "title": "Issue Title",
      "complaint": "What's wrong with the transition or this specific step",
      "fix": "Concrete action to improve the flow"
    }
  ]
}

Provide exactly 3 issues, ordered by severity. Focus on the JOURNEY, not individual page design.`
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's profile and check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_balance, tier')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: AnalyzeJourneyRequest = await req.json()
    const { steps } = body

    if (!steps || steps.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Need at least 2 steps for journey analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Journey analysis costs 1 credit per step
    const creditCost = steps.length

    // Check credits (agency tier has unlimited)
    if (profile.tier !== 'agency' && profile.credits_balance < creditCost) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Not enough credits. Need ${creditCost}, have ${profile.credits_balance}`
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build prompt
    const prompt = buildJourneyPrompt(steps)

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build multi-image content
    const imageParts = steps.map(step => {
      const base64Data = step.screenshot.includes(',')
        ? step.screenshot.split(',')[1]
        : step.screenshot
      return {
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data,
        },
      }
    })

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...imageParts,
            ],
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse JSON from response
    let result
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse AI response:', responseText)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct credits (only for non-agency tiers)
    if (profile.tier !== 'agency') {
      await supabase
        .from('profiles')
        .update({ credits_balance: profile.credits_balance - creditCost })
        .eq('id', user.id)
    }

    // Save journey audit to history
    await supabase.from('audits').insert({
      user_id: user.id,
      url: steps[0].url, // First step URL as the "url"
      grade: result.grade,
      mode: 'journey',
      json_result: result,
    })

    return new Response(
      JSON.stringify({
        success: true,
        result,
        credits_remaining: profile.tier === 'agency' ? -1 : profile.credits_balance - creditCost,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
