Here is the complete Master Build Specification.

How to use this:

Copy the content inside the code block below.

Save it as a file named RoastMyUI_PRD.md.

Upload this file to Claude (or Cursor/Windsurf) and use the following prompt:

"I am building a Chrome Extension. Attached is the full PRD and Technical Specification. Please read the document, set up the project structure, and help me build Phase 1 step-by-step, starting with the manifest.json and directory creation."

code
Markdown
download
content_copy
expand_less
# PRODUCT SPECIFICATION: RoastMyUI (Chrome Extension)

## 1. Product Overview
**RoastMyUI** is a Chrome Extension that uses Multimodal AI (Vision + Text) to analyze the current webpage a user is viewing. It acts as a brutal, high-level UX consultant, providing "tough love" feedback on design, copy, and conversion blockers.

### Core Value Prop
*   **One-Click Audit:** No dashboards, no signup. Works instantly on the active tab.
*   **Multimodal Analysis:** "Sees" the site (layout, whitespace, contrast) rather than just reading code.
*   **Persona-Based:** Users can choose who is roasting them (e.g., A VC Investor, A Gen-Z User, A Brutal Designer).
*   **Privacy First:** BYOK (Bring Your Own Key) model. No data stored on our servers.

## 2. Technical Architecture
### Tech Stack
*   **Framework:** React (Vite) + TypeScript.
*   **Styling:** Tailwind CSS (via PostCSS for extension compatibility).
*   **Runtime:** Chrome Extension Manifest V3.
*   **AI Provider:** Google Gemini 1.5 Flash API (chosen for speed, low cost, and large context window for images) OR OpenAI GPT-4o-mini.
*   **Storage:** `chrome.storage.local` (for saving API keys and user preferences).

### Component Architecture
1.  **Popup (UI):** The main interface. Handles API key input, persona selection, and displaying the results.
2.  **Background Script (Service Worker):** Handles the screenshot capture command (`chrome.tabs.captureVisibleTab`).
3.  **LLM Service:** A utility module to handle the fetch request to the AI provider.

## 3. User Flow (The "Happy Path")
1.  **Installation:** User installs extension.
2.  **Setup:** User clicks icon. A "Settings" view asks for their Gemini API Key (saved locally).
3.  **Action:** User navigates to a target website.
4.  **Trigger:** User opens extension.
    *   Selects Persona (Default: "Brutal Designer").
    *   Clicks big red "ROAST THIS SITE" button.
5.  **Processing:**
    *   Extension captures visible tab as Base64 image.
    *   Extension sends Image + System Prompt to API.
6.  **Result:**
    *   Loading state (funny quips like "Putting on my glasses...", "Judging your font choice...").
    *   Result View: Displays a letter grade (F to A+) and 3 bulleted "Roasts" with actionable fixes.

## 4. Detailed Feature Requirements

### A. The Settings / Onboarding
*   Input field for API Key (masked).
*   "Test Key" button to validate connection.
*   Link to "Get Free Gemini Key" (Google AI Studio).

### B. The Persona Selector
Dropdown or Toggle to select the "System Prompt" flavor:
1.  **The VC Investor:** Focuses on business clarity, value prop, and "above the fold" confusion.
2.  **The Gen-Z User:** Focuses on "cringe" copy, mobile responsiveness, and outdated aesthetics.
3.  **The Brutal Designer:** Focuses on alignment, contrast, whitespace, and visual hierarchy.

### C. The Screenshot Logic
*   Must use `chrome.tabs.captureVisibleTab`.
*   Image must be optimized (resized if > 4MB to fit API limits, though Gemini is generous).
*   Format: JPEG (quality 80).

### D. The Output Display
*   **The Score:** A large visual grade (A, B, C, D, F). Color-coded (Green to Red).
*   **The Summary:** A one-sentence ruthless summary.
*   **The Critique:** Markdown rendered text.
    *   **Bad:** "The button is hard to see."
    *   **Good:** "Your CTA blends into the background. Change the hex code to a contrasting color or nobody will ever pay you."

## 5. AI System Prompts (The "Brain")

**Base System Instruction:**
> You are RoastMyUI, a world-class UX auditor known for brutal honesty. You do not hold back. You are analyzing a screenshot of a website. Your goal is to identify the top 3 conversion blockers.
>
> **Output Format:**
> Return the response in raw JSON format (no markdown blocks) with this structure:
> {
>   "grade": "C-",
>   "summary": "A short, mean 1-sentence summary of the vibe.",
>   "roasts": [
>     {"title": "Visual Hierarchy", "complaint": "The brutal critique.", "fix": " The technical fix."}
>   ]
> }

**Persona Modifications:**
*   *If VC:* "Focus on: Can I tell what this startup does in 3 seconds? Is the business model clear? Ignore pretty fonts, look for money."
*   *If Gen-Z:* "Focus on: Does this look like it was built in 2010? Is the copy too long (TL;DR)? Is it mobile-friendly? Use slang like 'cringe' or 'mid'."
*   *If Designer:* "Focus on: Inconsistent padding, bad typography, color clashes, and accessibility failures."

## 6. Directory Structure (Scaffolding)

```text
roast-my-ui/
├── manifest.json
├── package.json
├── vite.config.ts
├── postcss.config.js
├── tailwind.config.js
├── public/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── src/
    ├── popup/
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx
    │   └── components/
    │       ├── ApiKeyInput.tsx
    │       ├── PersonaSelector.tsx
    │       └── RoastResult.tsx
    ├── background/
    │   └── index.ts
    ├── utils/
    │   ├── gemini.ts       # API handling
    │   └── storage.ts      # Local storage helpers
    └── styles/
        └── index.css
7. Implementation Roadmap (Phase 1)

Step 1: Scaffold

Initialize Vite + React + TS.

Configure Tailwind.

Set up manifest.json with permissions: activeTab, storage, scripting.

Step 2: Core Logic (No UI)

Create gemini.ts to test sending a hardcoded text prompt to the API.

Create capture.ts to log the base64 string of the current tab to the console.

Step 3: UI Construction

Build the Popup inputs (Key, Persona).

Build the Result display component.

Step 4: Integration

Wire the "Roast" button to:

Capture screenshot.

Pass screenshot + Persona prompt to Gemini.

Parse JSON response.

Render data.

Step 5: Polish

Add error handling (e.g., "API Key Invalid", "Image too large").

Add loading spinners.

8. Specific Constraints for AI Builder

Do not use a backend server. Everything must run client-side in the browser.

Do not use complex state management libraries (Redux). Use React Context or local state.

Do not hallucinate API endpoints. Use the standard Google Generative AI REST API or SDK for JS.
