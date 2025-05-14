// Blindspot Backend Server
// Secure proxy for Gemini 2.0 Flash Vision API with streaming chat support
// Deploy to Vercel, Fly.io, or run locally

import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompt for SXO Consultant
const SXO_SYSTEM_PROMPT = `You are Blindspot, a Senior SXO (Search Experience Optimization) Consultant with 15+ years of experience in SEO, UX design, copywriting, and conversion rate optimization.

Your expertise spans three domains:
1. **SEO** - Technical SEO, keyword strategy, search intent, CTR optimization
2. **Copywriting** - Headlines, CTAs, value propositions, persuasive messaging
3. **Design** - Visual hierarchy, above-the-fold optimization, conversion layouts

You have access to:
- A screenshot of the webpage being audited
- Google Search Console data (if available): clicks, impressions, CTR, top keywords

Your communication style:
- Direct and actionable (no fluff)
- Specific (point to exact elements, give exact copy/code)
- Data-informed (always reference GSC metrics when available)
- Consultant-like (you're a trusted advisor, not a tool)

When giving advice:
- Reference specific elements you see in the screenshot
- Provide ready-to-use copy alternatives
- Include CSS/Tailwind code snippets when discussing layout changes
- Explain WHY something works or doesn't work

Remember: The user can ask follow-up questions. Keep the conversation context and refer back to previous points when relevant.`

// Initial audit prompt builder
function buildInitialAuditPrompt(gscData, pageContext) {
  let prompt = `## Initial SXO Audit Request

**Page**: ${pageContext?.title || 'Unknown'}
**URL**: ${pageContext?.url || 'Unknown'}

`

  if (gscData) {
    prompt += `### Google Search Console Data (Last 28 Days)
- Total Clicks: ${gscData.clicks.toLocaleString()}
- Total Impressions: ${gscData.impressions.toLocaleString()}
- Average CTR: ${(gscData.ctr * 100).toFixed(2)}%
- Average Position: ${gscData.position.toFixed(1)}

**Top Ranking Keywords**:
${gscData.topQueries
  .slice(0, 5)
  .map((q, i) => `${i + 1}. "${q.query}" - ${q.clicks} clicks, ${(q.ctr * 100).toFixed(1)}% CTR`)
  .join('\n')}

---

Provide a comprehensive SXO audit covering:

## 1. The Disconnect
Compare the visual design/messaging with the keywords this page ranks for:
- Does the hero section speak to what searchers are looking for?
- Is there a mismatch between the "vibe" and the search intent?

## 2. CTR Analysis
With a ${(gscData.ctr * 100).toFixed(1)}% CTR:
- What's causing users to bounce or not engage?
- Give ONE specific above-the-fold change to improve CTR

## 3. Copywriting Audit
- Is the headline compelling for the target keywords?
- Provide 2-3 alternative headlines optimized for "${gscData.topQueries[0]?.query || 'the top keyword'}"
- Rate the CTA copy and suggest improvements

## 4. Design & Conversion
- Is the visual hierarchy guiding users to convert?
- Identify specific conversion blockers
- Suggest layout improvements (with Tailwind classes if applicable)

## 5. Action Plan
Three prioritized fixes, each with:
- What to change
- Why it matters
- How to implement (specific copy or code)

Be specific. Reference exact elements you see in the screenshot.
`
  } else {
    prompt += `### Note: No GSC data available for this domain

Provide a comprehensive SXO audit covering:

## 1. First Impressions
- What message does the page communicate in the first 3 seconds?
- What keywords would this page likely rank for?

## 2. Copywriting Audit
- Rate the headline (is it specific, benefit-driven, keyword-aware?)
- Provide 2-3 alternative headline options
- Evaluate the CTA copy and suggest improvements

## 3. Design & Conversion
- Is the visual hierarchy clear?
- Are trust signals present and visible?
- What's blocking conversions?

## 4. SEO Readiness
- Based on the content visible, what search intent does this serve?
- What's missing for better rankings?

## 5. Action Plan
Three prioritized fixes with specific implementation guidance.
`
  }

  return prompt
}

// Chat endpoint with streaming (SSE)
app.post('/api/chat', async (req, res) => {
  try {
    const { screenshot, gscData, pageContext, history, message } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot is required' })
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Build conversation history for Gemini
    const conversationHistory = []

    // Add system context
    conversationHistory.push({
      role: 'user',
      parts: [{ text: SXO_SYSTEM_PROMPT }],
    })
    conversationHistory.push({
      role: 'model',
      parts: [{ text: 'Understood. I\'m ready to provide SXO consulting. Please share the page screenshot and any available GSC data.' }],
    })

    // Add the screenshot context (only for first message or if it's an audit request)
    const isInitialAudit = history.length === 0 || message.toLowerCase().includes('audit')

    if (isInitialAudit) {
      // Include screenshot in the context
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')

      conversationHistory.push({
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data,
            },
          },
          { text: buildInitialAuditPrompt(gscData, pageContext) },
        ],
      })
    } else {
      // For follow-up questions, add image context once
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')

      // Add screenshot context
      conversationHistory.push({
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data,
            },
          },
          { text: `Here's the page I'm asking about. GSC data: ${gscData ? `${gscData.clicks} clicks, ${(gscData.ctr * 100).toFixed(1)}% CTR, top keyword: "${gscData.topQueries[0]?.query || 'N/A'}"` : 'Not available'}` },
        ],
      })
      conversationHistory.push({
        role: 'model',
        parts: [{ text: 'I can see the page. What would you like to know?' }],
      })

      // Add conversation history
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationHistory.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })
        }
      }

      // Add current message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: message }],
      })
    }

    // Call Gemini with streaming
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const chat = model.startChat({
      history: conversationHistory.slice(0, -1), // All except the last message
    })

    const lastMessage = conversationHistory[conversationHistory.length - 1]
    const result = await chat.sendMessageStream(lastMessage.parts)

    // Stream the response
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Chat error:', error)
    res.write(`data: ${JSON.stringify({ error: error.message || 'Chat failed' })}\n\n`)
    res.end()
  }
})

// Legacy audit endpoint (non-streaming, for backwards compatibility)
app.post('/api/audit', async (req, res) => {
  try {
    const { screenshot, gscData, url, pageTitle } = req.body

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot is required' })
    }

    const pageContext = { url, title: pageTitle }
    const prompt = buildInitialAuditPrompt(gscData, pageContext)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')

    const result = await model.generateContent([
      { text: SXO_SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      },
      { text: prompt },
    ])

    const response = await result.response
    const report = response.text()

    res.json({ report })
  } catch (error) {
    console.error('Audit error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Audit failed',
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`Blindspot server running on port ${PORT}`)
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set - audits will fail')
  }
})

export default app
