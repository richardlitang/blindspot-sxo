import { useState, useRef, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatProps {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export default function Chat({ messages, isStreaming, streamingContent, onSendMessage, disabled }: ChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isStreaming && !disabled) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <ChatBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 text-zinc-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Run an audit first...' : 'Ask a follow-up question...'}
            disabled={isStreaming || disabled}
            rows={1}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || disabled}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 text-zinc-950 disabled:text-zinc-500 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Shift+Enter for new line · Context: current page + GSC data
        </p>
      </form>
    </div>
  )
}

function ChatBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-400">
        {message.content}
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-yellow-500 text-zinc-950'
            : 'bg-zinc-800 border border-zinc-700 text-zinc-100'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">
          <FormattedContent content={message.content} />
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-yellow-500 ml-1 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like formatting
  const lines = content.split('\n')

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim()

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <div key={i} className="font-semibold text-yellow-400 mt-2 mb-1">
              {trimmed.replace('### ', '')}
            </div>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <div key={i} className="font-semibold mt-2 mb-1">
              {trimmed.replace('## ', '')}
            </div>
          )
        }

        // Code blocks
        if (trimmed.startsWith('```')) {
          return null // Skip code fence markers
        }

        // Bold text
        const withBold = trimmed.split(/\*\*(.*?)\*\*/).map((part, j) => {
          if (j % 2 === 1) {
            return <strong key={j}>{part}</strong>
          }
          return part
        })

        // Inline code
        const withCode = withBold.map((part, j) => {
          if (typeof part === 'string') {
            return part.split(/`([^`]+)`/).map((codePart, k) => {
              if (k % 2 === 1) {
                return (
                  <code key={`${j}-${k}`} className="bg-zinc-700 px-1 rounded text-xs">
                    {codePart}
                  </code>
                )
              }
              return codePart
            })
          }
          return part
        })

        return (
          <div key={i} className={trimmed ? '' : 'h-2'}>
            {withCode}
          </div>
        )
      })}
    </>
  )
}
