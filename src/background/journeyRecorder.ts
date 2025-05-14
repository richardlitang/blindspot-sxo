// Journey Recorder - Captures user flow across multiple pages
// Records screenshots as user navigates, then analyzes the full journey

export interface JourneyStep {
  step: number
  url: string
  title: string
  screenshot: string // base64
  timestamp: number
}

export interface JourneySession {
  id: string
  steps: JourneyStep[]
  startTime: number
  isRecording: boolean
}

// Session state (persisted in memory for the service worker lifecycle)
let currentSession: JourneySession | null = null

// Generate unique session ID
function generateSessionId(): string {
  return `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Start a new recording session
export function startRecording(): JourneySession {
  currentSession = {
    id: generateSessionId(),
    steps: [],
    startTime: Date.now(),
    isRecording: true,
  }

  // Set up navigation listener
  setupNavigationListener()

  return currentSession
}

// Stop recording and return the session
export function stopRecording(): JourneySession | null {
  if (!currentSession) return null

  currentSession.isRecording = false
  removeNavigationListener()

  const session = currentSession
  currentSession = null

  return session
}

// Get current session status
export function getSessionStatus(): { isRecording: boolean; stepCount: number } | null {
  if (!currentSession) return null

  return {
    isRecording: currentSession.isRecording,
    stepCount: currentSession.steps.length,
  }
}

// Get current session
export function getCurrentSession(): JourneySession | null {
  return currentSession
}

// Capture current page and add to session
export async function captureStep(tabId: number, windowId: number): Promise<JourneyStep | null> {
  if (!currentSession || !currentSession.isRecording) return null

  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId)

    // Capture screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'jpeg',
      quality: 80,
    })

    const step: JourneyStep = {
      step: currentSession.steps.length + 1,
      url: tab.url || '',
      title: tab.title || '',
      screenshot: dataUrl,
      timestamp: Date.now(),
    }

    currentSession.steps.push(step)

    return step
  } catch (error) {
    console.error('Failed to capture step:', error)
    return null
  }
}

// Navigation listener handler
type TabChangeInfo = { status?: string; url?: string }
let navigationHandler: ((tabId: number, changeInfo: TabChangeInfo, tab: chrome.tabs.Tab) => void) | null = null

function setupNavigationListener() {
  if (navigationHandler) return // Already set up

  navigationHandler = async (tabId, changeInfo, tab) => {
    // Only capture on complete load
    if (changeInfo.status !== 'complete') return
    if (!currentSession?.isRecording) return

    // Only capture the active tab in the current window
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab?.id !== tabId) return

    // Skip chrome:// and extension pages
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) return

    // Wait a moment for the page to render
    await new Promise(resolve => setTimeout(resolve, 500))

    // Capture the step
    if (tab.windowId) {
      await captureStep(tabId, tab.windowId)
    }
  }

  chrome.tabs.onUpdated.addListener(navigationHandler)
}

function removeNavigationListener() {
  if (navigationHandler) {
    chrome.tabs.onUpdated.removeListener(navigationHandler)
    navigationHandler = null
  }
}

// Build the multi-image prompt for journey analysis
export function buildJourneyPrompt(steps: JourneyStep[]): string {
  const stepDescriptions = steps.map((s, i) =>
    `Image ${i + 1}: Step ${s.step} - "${s.title}" (${new URL(s.url).pathname})`
  ).join('\n')

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
