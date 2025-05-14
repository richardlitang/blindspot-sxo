// Blindspot Service Worker
// Handles OAuth2, screenshot capture, and sidepanel management

// Types
interface GSCData {
  clicks: number
  impressions: number
  ctr: number
  position: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number }>
}

interface AuditRequest {
  screenshot: string
  gscData: GSCData | null
  url: string
  pageTitle: string
}

interface PageContext {
  title: string
  description: string
  h1: string
  url: string
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gsc_access_token',
  TOKEN_EXPIRY: 'gsc_token_expiry',
} as const

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'AUTH_GSC':
      handleGSCAuth().then(sendResponse)
      return true

    case 'LOGOUT_GSC':
      handleGSCLogout().then(sendResponse)
      return true

    case 'GET_GSC_DATA':
      getGSCData(message.siteUrl).then(sendResponse)
      return true

    case 'CAPTURE_SCREENSHOT':
      captureScreenshot().then(sendResponse)
      return true

    case 'GET_PAGE_CONTEXT':
      getPageContext().then(sendResponse)
      return true

    case 'RUN_AUDIT':
      runSXOAudit(message.data as AuditRequest).then(sendResponse)
      return true

    case 'CHECK_AUTH':
      checkAuthStatus().then(sendResponse)
      return true
  }
})

// OAuth2 Authentication
async function handleGSCAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true })
    const token = result.token

    if (!token) {
      return { success: false, error: 'No token received' }
    }

    // Store token with expiry (1 hour)
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACCESS_TOKEN]: token,
      [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000,
    })

    return { success: true }
  } catch (error) {
    console.error('Auth error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Auth failed' }
  }
}

// Logout
async function handleGSCLogout(): Promise<{ success: boolean }> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ACCESS_TOKEN])
    const token = result[STORAGE_KEYS.ACCESS_TOKEN] as string | undefined

    if (token) {
      // Revoke the token
      await chrome.identity.removeCachedAuthToken({ token })
    }

    await chrome.storage.local.remove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.TOKEN_EXPIRY])
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: true } // Still consider it successful
  }
}

// Check auth status
async function checkAuthStatus(): Promise<{ authenticated: boolean; token?: string }> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.TOKEN_EXPIRY])
    const token = result[STORAGE_KEYS.ACCESS_TOKEN] as string | undefined
    const expiry = result[STORAGE_KEYS.TOKEN_EXPIRY] as number | undefined

    if (token && expiry && Date.now() < expiry) {
      return { authenticated: true, token }
    }

    // Try to get a fresh token silently
    try {
      const authResult = await chrome.identity.getAuthToken({ interactive: false })
      const newToken = authResult.token

      if (newToken) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.ACCESS_TOKEN]: newToken,
          [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + 3600000,
        })
        return { authenticated: true, token: newToken }
      }
    } catch {
      // Silent auth failed, user needs to re-authenticate
    }

    return { authenticated: false }
  } catch {
    return { authenticated: false }
  }
}

// Get GSC data for a site
async function getGSCData(siteUrl: string): Promise<{ success: boolean; data?: GSCData; error?: string }> {
  try {
    const authStatus = await checkAuthStatus()
    if (!authStatus.authenticated || !authStatus.token) {
      return { success: false, error: 'Not authenticated' }
    }

    // Try different URL formats that GSC might recognize
    const urlVariants = getGSCUrlVariants(siteUrl)

    for (const normalizedUrl of urlVariants) {
      try {
        const result = await fetchGSCDataForUrl(normalizedUrl, authStatus.token)
        if (result.success) {
          return result
        }
      } catch {
        // Try next variant
        continue
      }
    }

    return { success: false, error: 'Site not found in GSC. Make sure the property is verified.' }
  } catch (error) {
    console.error('GSC fetch error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch GSC data' }
  }
}

// Get different URL formats to try with GSC
function getGSCUrlVariants(url: string): string[] {
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname.replace('www.', '')

    return [
      // Domain property (most common for newer setups)
      `sc-domain:${domain}`,
      // URL prefix properties
      `${parsed.protocol}//${parsed.hostname}/`,
      `https://${parsed.hostname}/`,
      `https://www.${domain}/`,
      `http://${parsed.hostname}/`,
    ]
  } catch {
    return [url]
  }
}

// Fetch GSC data for a specific URL format
async function fetchGSCDataForUrl(
  siteUrl: string,
  token: string
): Promise<{ success: boolean; data?: GSCData; error?: string }> {
  // Get date range (last 28 days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28)

  const dateFormat = (d: Date) => d.toISOString().split('T')[0]

  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dateFormat(startDate),
        endDate: dateFormat(endDate),
        dimensions: ['query'],
        rowLimit: 10,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`GSC API error: ${response.status}`)
  }

  const data = await response.json()

  // Calculate totals
  let totalClicks = 0
  let totalImpressions = 0
  let totalPosition = 0
  const topQueries: GSCData['topQueries'] = []

  if (data.rows) {
    for (const row of data.rows) {
      totalClicks += row.clicks || 0
      totalImpressions += row.impressions || 0
      totalPosition += row.position || 0
      topQueries.push({
        query: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
      })
    }
  }

  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
  const avgPosition = data.rows?.length > 0 ? totalPosition / data.rows.length : 0

  return {
    success: true,
    data: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPosition,
      topQueries,
    },
  }
}

// Capture screenshot
async function captureScreenshot(): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id || !tab.windowId) {
      return { success: false, error: 'No active tab' }
    }

    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90,
    })

    return { success: true, screenshot }
  } catch (error) {
    console.error('Screenshot error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Screenshot failed' }
  }
}

// Get page context
async function getPageContext(): Promise<{ success: boolean; context?: PageContext; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || ''
        const metaDesc = document.querySelector('meta[name="description"]')
        const description = metaDesc?.getAttribute('content') || ''
        const h1Element = document.querySelector('h1')
        const h1 = h1Element?.textContent?.trim() || ''
        return { title, description, h1 }
      },
    })

    const extracted = results[0]?.result as { title: string; description: string; h1: string }
    return {
      success: true,
      context: { ...extracted, url: tab.url || '' },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Context extraction failed' }
  }
}

// Run SXO Audit
async function runSXOAudit(request: AuditRequest): Promise<{ success: boolean; report?: string; error?: string }> {
  try {
    // Get API URL from storage or use default
    const result = await chrome.storage.sync.get({ apiUrl: 'http://localhost:3001' })
    const apiUrl = result.apiUrl as string

    const response = await fetch(`${apiUrl}/api/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `API error: ${errorText}` }
    }

    const data = await response.json()
    return { success: true, report: data.report }
  } catch (error) {
    console.error('Audit error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Audit failed' }
  }
}

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)

console.log('Blindspot service worker loaded')

export {}
