import { useState, useEffect, useCallback } from 'react'
import GSCConnect from './components/GSCConnect'
import GSCStats from './components/GSCStats'
import Chat, { Message } from './components/Chat'

interface GSCData {
  clicks: number
  impressions: number
  ctr: number
  position: number
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number }>
}

interface PageContext {
  title: string
  description: string
  h1: string
  url: string
}

interface ConversationContext {
  screenshot: string
  gscData: GSCData | null
  pageContext: PageContext
  auditCompleted: boolean
}

type View = 'main' | 'settings'

export default function App() {
  const [view, setView] = useState<View>('main')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [gscData, setGscData] = useState<GSCData | null>(null)
  const [gscError, setGscError] = useState<string | null>(null)
  const [pageContext, setPageContext] = useState<PageContext | null>(null)

  // Conversation state
  const [context, setContext] = useState<ConversationContext | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)

  // Check auth status on load
  useEffect(() => {
    checkAuth()
  }, [])

  // Fetch GSC data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentPageData()
    }
  }, [isAuthenticated])

  // Listen for tab changes to refresh context
  useEffect(() => {
    const handleTabChange = () => {
      if (isAuthenticated) {
        fetchCurrentPageData()
        // Clear conversation when page changes
        setContext(null)
        setMessages([])
      }
    }

    // Listen for visibility change (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleTabChange()
      }
    })
  }, [isAuthenticated])

  async function checkAuth() {
    setIsLoading(true)
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' })
    setIsAuthenticated(response.authenticated)
    setIsLoading(false)
  }

  async function handleConnect() {
    const response = await chrome.runtime.sendMessage({ type: 'AUTH_GSC' })
    if (response.success) {
      setIsAuthenticated(true)
    }
  }

  async function handleDisconnect() {
    await chrome.runtime.sendMessage({ type: 'LOGOUT_GSC' })
    setIsAuthenticated(false)
    setGscData(null)
    setContext(null)
    setMessages([])
  }

  async function fetchCurrentPageData() {
    const contextResponse = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' })
    if (contextResponse.success) {
      setPageContext(contextResponse.context)

      setGscError(null)
      const gscResponse = await chrome.runtime.sendMessage({
        type: 'GET_GSC_DATA',
        siteUrl: contextResponse.context.url,
      })

      if (gscResponse.success) {
        setGscData(gscResponse.data)
      } else {
        setGscError(gscResponse.error || 'Failed to fetch GSC data')
      }
    }
  }

  const runInitialAudit = useCallback(async () => {
    if (!pageContext) return

    setIsAuditing(true)
    setMessages([])
    setStreamingContent('')

    try {
      // Capture screenshot
      const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' })
      if (!screenshotResponse.success) {
        throw new Error(screenshotResponse.error || 'Screenshot failed')
      }

      // Store context for conversation
      const newContext: ConversationContext = {
        screenshot: screenshotResponse.screenshot,
        gscData: gscData,
        pageContext: pageContext,
        auditCompleted: false,
      }
      setContext(newContext)

      // Add system message
      const systemMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: `Analyzing ${pageContext.title || pageContext.url}...`,
        timestamp: Date.now(),
      }
      setMessages([systemMessage])

      // Stream the initial audit
      await streamChat(newContext, [], 'Run a complete SXO audit of this page.')

      // Mark audit as completed
      setContext((prev) => prev ? { ...prev, auditCompleted: true } : null)
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Audit failed'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsAuditing(false)
    }
  }, [pageContext, gscData])

  const handleSendMessage = useCallback(async (userMessage: string) => {
    if (!context) return

    // Add user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])

    // Stream response
    await streamChat(context, [...messages, userMsg], userMessage)
  }, [context, messages])

  async function streamChat(ctx: ConversationContext, history: Message[], userMessage: string) {
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const { apiUrl } = await chrome.storage.sync.get({ apiUrl: 'http://localhost:3001' })

      const response = await fetch(`${apiUrl as string}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot: ctx.screenshot,
          gscData: ctx.gscData,
          pageContext: ctx.pageContext,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          message: userMessage,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                break
              }
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullContent += parsed.content
                  setStreamingContent(fullContent)
                }
              } catch {
                // Not JSON, treat as raw text
                fullContent += data
                setStreamingContent(fullContent)
              }
            }
          }
        }
      }

      // Add complete message to history
      if (fullContent) {
        const assistantMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch (error) {
      const errorMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Request failed'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  if (view === 'settings') {
    return <SettingsView onBack={() => setView('main')} onDisconnect={handleDisconnect} />
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
              <span className="text-zinc-950 font-bold text-sm">BS</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">Blindspot</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">SXO Consultant</p>
            </div>
          </div>
          <button
            onClick={() => setView('settings')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
          </div>
        ) : !isAuthenticated ? (
          <div className="p-4">
            <GSCConnect onConnect={handleConnect} />
          </div>
        ) : !context?.auditCompleted ? (
          // Pre-audit view
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Page Info */}
            {pageContext && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Page</p>
                <p className="text-sm font-medium truncate">{pageContext.title || 'Untitled'}</p>
                <p className="text-xs text-zinc-500 truncate">{pageContext.url}</p>
              </div>
            )}

            {/* GSC Stats */}
            <GSCStats data={gscData} error={gscError} onRefresh={fetchCurrentPageData} />

            {/* Start Audit Button */}
            <button
              onClick={runInitialAudit}
              disabled={isAuditing}
              className="w-full py-4 px-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 text-zinc-950 disabled:text-zinc-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {isAuditing ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start SXO Consultation
                </>
              )}
            </button>

            {/* What you'll get */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">What you'll get</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Visual-to-Keyword alignment analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>CTR improvement suggestions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Conversion blocker identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Follow-up Q&A with your AI consultant</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          // Chat view (post-audit)
          <Chat
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onSendMessage={handleSendMessage}
            disabled={!context?.auditCompleted}
          />
        )}
      </main>

      {/* New Audit Button (when in chat) */}
      {context?.auditCompleted && (
        <div className="border-t border-zinc-800 p-2 flex-shrink-0">
          <button
            onClick={() => {
              setContext(null)
              setMessages([])
            }}
            className="w-full py-2 px-3 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            ← New Audit
          </button>
        </div>
      )}
    </div>
  )
}

// Settings View Component
function SettingsView({ onBack, onDisconnect }: { onBack: () => void; onDisconnect: () => void }) {
  const [apiUrl, setApiUrl] = useState('http://localhost:3001')

  useEffect(() => {
    chrome.storage.sync.get({ apiUrl: 'http://localhost:3001' }).then((result) => {
      setApiUrl(result.apiUrl as string)
    })
  }, [])

  async function saveApiUrl() {
    await chrome.storage.sync.set({ apiUrl })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-zinc-800 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold">Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">API Server URL</span>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
              placeholder="http://localhost:3001"
            />
          </label>
          <button
            onClick={saveApiUrl}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm transition-colors"
          >
            Save
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Google Search Console</h3>
          <p className="text-xs text-zinc-500 mb-3">Disconnect your GSC account from Blindspot.</p>
          <button
            onClick={onDisconnect}
            className="w-full py-2 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-sm text-red-400 transition-colors"
          >
            Disconnect GSC
          </button>
        </div>
      </main>
    </div>
  )
}
