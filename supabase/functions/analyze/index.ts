// Supabase Edge Function: /analyze
// Handles credit check -> Gemini API call -> credit decrement

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildPrompt } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  screenshot: string
  mode: 'professional' | 'conversion' | 'roast'
  url: string
  context?: {
    title?: string
    description?: string
    h1?: string
  }
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

    // Check credits (agency tier has unlimited)
    if (profile.tier !== 'agency' && profile.credits_balance <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No credits remaining' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: AnalyzeRequest = await req.json()
    const { screenshot, mode, url, context } = body

    // Build prompt using the tuned prompts
    const prompt = buildPrompt(mode, {
      url,
      title: context?.title,
      description: context?.description,
      h1: context?.h1,
    })

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract base64 data from data URL
    const base64Data = screenshot.includes(',') ? screenshot.split(',')[1] : screenshot

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
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
      // Don't deduct credit on API failure
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

    // Parse JSON from response (handle potential markdown wrapping)
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

    // Deduct credit (only for non-agency tiers)
    if (profile.tier !== 'agency') {
      await supabase
        .from('profiles')
        .update({ credits_balance: profile.credits_balance - 1 })
        .eq('id', user.id)
    }

    // Save audit to history
    await supabase.from('audits').insert({
      user_id: user.id,
      url,
      grade: result.grade,
      mode,
      json_result: result,
    })

    return new Response(
      JSON.stringify({
        success: true,
        result,
        credits_remaining: profile.tier === 'agency' ? -1 : profile.credits_balance - 1,
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
