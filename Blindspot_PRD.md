# PRODUCT SPECIFICATION: Blindspot (formerly RoastMyUI)

## 1. Product Overview
**Blindspot** is a professional Chrome Extension that uses Multimodal AI to analyze user interfaces for design flaws, conversion blockers, and friction points. Unlike generic "chat" tools, Blindspot captures the entire user journey, understands business context, and provides structured, code-ready improvements.

### Core Value Prop
*   **Three Analysis Modes:** From professional auditing to viral "roasting."
*   **Full-Page Intelligence:** Captures the entire DOM/Screenshot (not just the viewport).
*   **Friction Hunting:** Analyzes the *flow* between pages, not just static screens (Phase 2).
*   **Actionable Code:** Returns Tailwind CSS fixes, not just text advice.

## 2. Technical Architecture

### Tech Stack
*   **Frontend:** React (Vite) + TypeScript + Tailwind CSS.
*   **Extension Framework:** Chrome Manifest V3.
*   **Backend / Auth:** Supabase (Auth, PostgreSQL, Edge Functions).
*   **AI Logic:** Supabase Edge Function -> Google Gemini 1.5 Flash (or Pro).
*   **Payments:** Stripe (integrated via Supabase).

### Data Flow
1.  **Extension:** Captures screenshot(s) & DOM metadata.
2.  **Auth:** Checks Supabase session.
3.  **API Call:** Sends data to Supabase Edge Function (`/analyze`).
4.  **Edge Function:**
    *   Verifies Credit Balance in `profiles` table.
    *   Constructs the "Persona Prompt" based on selected Mode.
    *   Calls Gemini API.
    *   Decrements Credit Balance (if successful).
    *   Returns JSON to Extension.
5.  **Extension:** Renders the Dashboard UI.

### Database Schema (Supabase)
*   **`profiles`**:
    *   `id` (uuid, PK, ref `auth.users`)
    *   `credits_balance` (int, default: 3)
    *   `tier` (text: 'free', 'builder', 'agency')
    *   `stripe_customer_id` (text)
*   **`audits`** (for History):
    *   `id` (uuid, PK)
    *   `user_id` (uuid)
    *   `url` (text)
    *   `grade` (text)
    *   `mode` (text)
    *   `json_result` (jsonb)
    *   `created_at` (timestamp)

## 3. User Experience & Features

### A. The "Three Modes" (Selector)
1.  **Professional (Default):**
    *   *Focus:* Accessibility, Usability, Hierarchy.
    *   *Tone:* Constructive, Consultant-like.
2.  **Conversion (The Money Maker):**
    *   *Focus:* CTAs, Trust Signals, Copywriting, Funnel Friction.
    *   *Tone:* Direct, Revenue-obsessed.
3.  **The Roast (The Viral Hook):**
    *   *Focus:* "Vibe check," outdated design, cringey copy.
    *   *Tone:* Brutal, funny, Gen-Z slang (the original viral concept).

### B. The Output Dashboard
*   **Visual Grade:** Large A+ to F scorecard.
*   **The Summary:** 1-sentence executive summary.
*   **The Issues List:**
    *   **Severity:** High/Med/Low.
    *   **The Fix:** Text explanation.
    *   **The Code:** "Copy Tailwind Classes" button (e.g., `bg-red-500 hover:bg-red-600...`).

### C. Competitive Moats (Why we win)
1.  **Full-Page Stitching:** We don't just screenshot the viewport. We capture the whole landing page to understand the narrative flow.
2.  **Context Injection:** We scrape `<title>`, `<meta description>`, and `<h1>` tags *before* sending to AI, so the AI knows "This is a B2B SaaS for Dentists" without guessing.
3.  **Journey Recorder (Phase 2):** User clicks "Record", navigates 3 pages, and we analyze the *transition* logic.

## 4. Monetization Model (Credit System)

| Tier | Price | Credits | Target User |
| :--- | :--- | :--- | :--- |
| **Free Taste** | $0 | 3 (One-time) | Acquisition (Requires Login) |
| **Builder Pack** | $12 | 20 Credits | Solopreneurs / Indie Hackers |
| **Agency Pro** | $49/mo | Unlimited + PDF | Agencies / CRO Freelancers |

*Logic:* If `credits > 0` OR `tier == 'agency'`, allow request. Else, return 402.

## 5. System Prompts Strategy

**Base Instruction:**
> "You are Blindspot, an elite UX & Conversion Auditor. You are analyzing a full-page screenshot of a website. You have access to the site's metadata context: {CONTEXT_JSON}.
> Your Output must be strict JSON."

**Mode Modifiers:**
*   *Professional:* "Identify accessibility failures (WCAG) and visual hierarchy issues. Be formal."
*   *Conversion:* "Ignore aesthetics unless they hurt sales. Focus on the Value Prop, CTA placement, and Trust Signals. Be ruthless about revenue."
*   *Roast:* "Be mean. Be funny. Roast the font choices, the stock photos, and the generic copy. Use slang."

## 6. Directory Structure

```text
blindspot/
├── manifest.json
├── package.json
├── vite.config.ts
├── supabase/
│   └── functions/
│       └── analyze/
│           └── index.ts  (The Edge Function)
├── src/
│   ├── popup/
│   │   ├── components/
│   │   │   ├── Auth.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── CreditCounter.tsx
│   │   ├── hooks/
│   │   │   └── useSupabase.ts
│   │   └── App.tsx
│   ├── background/
│   │   ├── capture.ts (Full page logic)
│   │   └── index.ts
│   ├── utils/
│   │   └── api.ts (Calls Supabase Edge Function)
│   └── styles/
│       └── index.css
└── public/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## 7. Implementation Roadmap

### Phase 1: The MVP (Core & Credits)

1. **Scaffold:** Vite + React + Tailwind + Manifest V3.
2. **Supabase Setup:**
   - Create Project.
   - Enable Auth (Email/Password + Google).
   - Create `profiles` table with Triggers (auto-create profile on signup with 3 credits).
3. **Capture Logic:** Implement `chrome.tabs.captureVisibleTab` (start with viewport for speed, then upgrade to full-page stitching).
4. **Edge Function:**
   - Write the TypeScript function to handle the Credit Check -> Gemini Call -> Deduct Credit transaction.
5. **UI:** Build the Login Screen, Mode Selector, and Results Dashboard.

### Phase 2: The "Moats" & Payments

- **Stripe Integration:** Add "Buy Credits" button in extension that links to Stripe Checkout.
- **Context Injection:** Add content script to scrape metadata and pass to API.
- **Journey Recorder (Beta):**
  - UI: "Start Flow Audit" button.
  - Logic: Listen for URL changes, capture snapshot sequence.
  - AI: Send multi-image array to Gemini Pro Vision.

### Phase 3: The Business (Agency)

- **PDF Export:** Generate branded reports.
- **History Tab:** View past audits.
- **Subscription Billing:** Handle recurring $49/mo tier.

## 8. Specific Constraints for AI Builder

- **Strict Type Safety:** Use TypeScript for everything, including Supabase database types.
- **Security:** NEVER expose the Gemini API Key in the frontend `dist/` code. It must live in Supabase Secrets.
- **Error Handling:** If Gemini fails (content safety filter), do not deduct a credit.
