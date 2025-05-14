# Blindspot

**Your AI-Powered SXO Consultant** — Bridging the gap between how your site *looks* and how it *performs*.

Blindspot is a Chrome Extension that combines **visual AI analysis** (Gemini 2.0 Flash Vision) with **real performance data** (Google Search Console) to deliver actionable SEO, copywriting, and design recommendations through a conversational interface.

![Blindspot](https://img.shields.io/badge/Chrome-Extension-yellow?style=flat-square&logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)

---

## Why Blindspot?

Static audits are commodities. The real value is **actionable consulting**.

| Traditional Tools | Blindspot |
|-------------------|-----------|
| Upload screenshot manually | One-click capture |
| Generic AI advice | Data-backed insights (GSC) |
| Copy results to ChatGPT for follow-up | Built-in conversational Q&A |
| "Your headline is weak" | "Here are 5 alternatives targeting your top keyword" |
| Tab switching | Side panel stays open while you browse |

---

## Features

### 1. Google Search Console Integration
- OAuth2 authentication via Chrome Identity API
- Fetches last 28 days of search performance
- Displays clicks, impressions, CTR, average position
- Shows top 10 ranking keywords with individual CTR

### 2. Visual AI Analysis
- Captures viewport screenshot with one click
- Sends to Gemini 2.0 Flash Vision for multimodal analysis
- Compares visual design against actual keyword rankings
- Identifies "vibe vs. performance" disconnects

### 3. Conversational Consulting
- Streaming responses (SSE) with real-time typing effect
- Full conversation memory within session
- Follow-up questions without re-auditing
- Context-aware (remembers screenshot + GSC data)

### 4. Three-Domain Expertise
- **SEO**: Technical SEO, keyword strategy, search intent, CTR optimization
- **Copywriting**: Headlines, CTAs, value propositions, persuasive messaging
- **Design**: Visual hierarchy, above-the-fold optimization, conversion layouts

### 5. Actionable Output
- Specific element references from screenshots
- Ready-to-use copy alternatives
- CSS/Tailwind code snippets for layout changes
- Prioritized action plans with implementation guidance

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Side      │  │  Service    │  │   Google APIs       │ │
│  │   Panel     │◄─┤  Worker     │◄─┤   - Identity (OAuth)│ │
│  │   (React)   │  │  (MV3)      │  │   - Search Console  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ Screenshot + GSC Data + Message
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express.js + Gemini 2.0 Flash Vision               │   │
│  │  - /api/chat (SSE streaming)                        │   │
│  │  - /api/audit (legacy, non-streaming)               │   │
│  │  - Conversation context management                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### User Flow

1. **Connect GSC** — One-click OAuth2 authentication
2. **Navigate** — Browse to any page you want to audit
3. **Start Consultation** — Click the button to capture & analyze
4. **Review Audit** — AI provides comprehensive SXO analysis
5. **Ask Follow-ups** — "Rewrite this headline for mobile" / "Give me the Tailwind CSS"
6. **Implement** — Copy the specific code/copy suggestions

---

## Setup

### Prerequisites

- Node.js 18+
- Google Cloud Console account
- Gemini API key

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/blindspot.git
cd blindspot
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Search Console API**:
   - APIs & Services → Library → Search "Search Console API" → Enable
4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Chrome Extension**
   - You'll need your Extension ID (get it after loading the extension once)

### 3. Configure Extension

Edit `manifest.json` and replace the client ID:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/webmasters.readonly"]
}
```

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key

### 5. Setup Backend Server

```bash
cd server
npm install
```

Create `server/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key-here
PORT=3001
```

### 6. Build Extension

```bash
# From root directory
npm run build
```

### 7. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Note your **Extension ID**
6. Update Google Cloud OAuth credentials with this ID

### 8. Run Backend

```bash
cd server
npm run dev
```

---

## Development

### Extension (Frontend)

```bash
npm run dev    # Watch mode for UI development
npm run build  # Production build
```

### Server (Backend)

```bash
cd server
npm run dev    # Node.js with --watch
npm start      # Production
```

### Project Structure

```
blindspot/
├── manifest.json              # Chrome extension manifest (MV3)
├── package.json               # Extension dependencies
├── vite.config.ts             # Build configuration
├── tsconfig.json              # TypeScript config
│
├── src/
│   ├── sidepanel/             # Side panel UI (React + TypeScript)
│   │   ├── App.tsx            # Main app with conversation state
│   │   ├── index.html         # Entry point
│   │   ├── main.tsx           # React mount
│   │   └── components/
│   │       ├── Chat.tsx       # Chat interface with streaming
│   │       ├── GSCConnect.tsx # OAuth connection UI
│   │       └── GSCStats.tsx   # Search Console metrics display
│   │
│   ├── background/
│   │   └── index.ts           # Service worker (OAuth2, GSC API, screenshots)
│   │
│   └── styles/
│       └── index.css          # Dark industrial theme (Tailwind)
│
├── server/                    # Backend API
│   ├── index.js               # Express server with SSE streaming
│   └── package.json
│
├── public/
│   └── icon-*.png             # Extension icons
│
└── dist/                      # Built extension (load this in Chrome)
```

---

## Deployment

### Backend Options

**Vercel** (Recommended for serverless):
```bash
cd server
npm i -g vercel
vercel deploy
```

**Fly.io** (Recommended for persistent):
```bash
cd server
fly launch
fly secrets set GEMINI_API_KEY=your-key
```

**Railway / Render**:
- Connect your repo
- Set `GEMINI_API_KEY` environment variable
- Deploy from `server/` directory

### Update Extension API URL

After deploying, update the API URL in the extension:
1. Click the extension icon
2. Go to Settings (gear icon)
3. Enter your production API URL

---

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `activeTab` | Capture screenshot of current page |
| `sidePanel` | Display UI in Chrome side panel |
| `identity` | OAuth2 for Google Search Console |
| `storage` | Save settings and auth tokens |
| `scripting` | Extract page metadata (title, description) |
| `host_permissions` | Call Google APIs (googleapis.com) |

---

## Example Conversations

**Initial Audit:**
> "Your hero section ranks for 'construction management software' but shows a generic stock photo of an office. The disconnect: searchers expect to see construction sites, project timelines, or the actual software UI. Your 2.1% CTR suggests users aren't finding what they expect."

**Follow-up:**
> **User:** "Give me 5 headline alternatives for that keyword"
>
> **Blindspot:** "Here are 5 alternatives optimized for 'construction management software':
> 1. 'Construction Management Software That Actually Gets Used on Job Sites'
> 2. 'From Blueprint to Completion: Project Management Built for Contractors'
> ..."

**Code Request:**
> **User:** "How do I move the CTA above the fold on mobile?"
>
> **Blindspot:** "Add these Tailwind classes to your CTA container:
> ```html
> <div class="order-first lg:order-none mt-4 lg:mt-0">
>   <button class="w-full lg:w-auto ...">
> ```
> This uses `order-first` to push it to the top on mobile while maintaining desktop layout."

---

## Troubleshooting

### "Site not found in GSC"
- Ensure the domain is verified in your Search Console
- Blindspot tries multiple URL formats (domain property, URL prefix)
- Check that you're logged into the correct Google account

### OAuth Errors
- Verify Extension ID matches Google Cloud Console
- Ensure Search Console API is enabled
- Try removing and re-adding the extension

### Streaming Not Working
- Check backend server is running
- Verify GEMINI_API_KEY is set correctly
- Check browser console for CORS errors
- Ensure API URL in settings is correct

### No GSC Data
- GSC data can be delayed up to 48 hours
- New properties may not have data yet
- The extension will still work (provides visual-only analysis)

---

## Roadmap

- [ ] PDF export of consultation transcripts
- [ ] Comparison mode (before/after audits)
- [ ] Team sharing (share audit links)
- [ ] Custom prompts / personas
- [ ] Integration with other data sources (GA4, Ahrefs)

---

## License

MIT

---

## Credits

Built with:
- [Gemini 2.0 Flash](https://ai.google.dev/) — Multimodal AI
- [React](https://react.dev/) — UI framework
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Vite](https://vitejs.dev/) — Build tool
- [Express](https://expressjs.com/) — Backend server

---

<p align="center">
  <strong>Stop getting generic advice. Get data-backed SXO consulting.</strong>
</p>
