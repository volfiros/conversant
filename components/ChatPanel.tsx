"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import { ChatMessage } from "./ChatMessage"
import { SUGGESTION_TYPE_LABELS } from "@/lib/types"
import type { SuggestionType } from "@/lib/types"
import { toast } from "sonner"
import { Send } from "lucide-react"

async function streamChat(
  apiKey: string,
  question: string,
  transcript: { text: string; timestamp: number }[],
  chatHistory: { role: string; content: string }[],
  customPrompt: string | undefined,
  contextWindow: number,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-groq-api-key": apiKey,
    },
    body: JSON.stringify({ question, transcript, chatHistory, customPrompt, contextWindow }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Chat request failed" }))
    throw new Error(err.error || "Chat request failed")
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No readable stream")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data: ")) continue
      const data = trimmed.slice(6)
      if (data === "[DONE]") return
      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          onChunk(parsed.content)
        }
      } catch {}
    }
  }
}

export function ChatPanel() {
  const {
    settings,
    transcript,
    chatMessages,
    isChatStreaming,
    chatAbortController,
    addChatMessage,
    updateChatMessage,
    setChatStreaming,
    setChatAbortController,
  } = useAppStore()

  const [input, setInput] = useState("")
  const bodyRef = useRef<HTMLDivElement>(null)
  const streamingIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    const handler = (e: Event) => {
      const { text, type } = (e as CustomEvent).detail
      handleSend(text, type)
    }
    window.addEventListener("suggestion-click", handler)
    return () => window.removeEventListener("suggestion-click", handler)
  })

  const handleSend = useCallback(async (text: string, suggestionType?: string) => {
    if (!text.trim()) return
    if (!settings.apiKey) {
      toast.error("Please set your Groq API key in Settings")
      return
    }

    if (chatAbortController) {
      chatAbortController.abort()
      if (streamingIdRef.current) {
        updateChatMessage(streamingIdRef.current, useAppStore.getState().chatMessages.find(m => m.id === streamingIdRef.current)?.content || "", false)
        streamingIdRef.current = null
      }
    }

    const userMsg = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      role: "user" as const,
      content: text,
      label: suggestionType ? SUGGESTION_TYPE_LABELS[suggestionType as SuggestionType] : undefined,
      timestamp: Date.now(),
    }
    addChatMessage(userMsg)
    setInput("")

    const assistantId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const assistantMsg = {
      id: assistantId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }
    addChatMessage(assistantMsg)
    streamingIdRef.current = assistantId
    setChatStreaming(true)

    const controller = new AbortController()
    setChatAbortController(controller)

    let accumulated = ""
    const history = chatMessages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      await streamChat(
        settings.apiKey,
        text,
        transcript,
        history,
        undefined,
        settings.chatContextWindow,
        (chunk) => {
          accumulated += chunk
          updateChatMessage(assistantId, accumulated, true)
        },
        controller.signal
      )
      updateChatMessage(assistantId, accumulated, false)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        updateChatMessage(assistantId, accumulated, false)
        return
      }
      toast.error("Chat streaming failed")
      updateChatMessage(assistantId, accumulated || "Failed to get response.", false)
    } finally {
      setChatStreaming(false)
      streamingIdRef.current = null
    }
  }, [settings, transcript, chatMessages, chatAbortController])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <div className="bg-panel border border-border rounded-[10px] flex flex-col overflow-hidden min-h-0">
      <header className="px-3.5 py-2.5 border-b border-border text-xs uppercase tracking-wider text-muted flex justify-between items-center">
        <span>3. Chat (detailed answers)</span>
        <span>session-only</span>
      </header>
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-3.5">
        <div className="bg-accent/8 border border-accent/30 text-[#cfd3dc] px-3 py-2 text-xs rounded-md mb-3 leading-relaxed">
          Clicking a suggestion adds it to this chat and streams a detailed answer.
          You can also type questions directly. One continuous chat per session.
        </div>
        {chatMessages.length === 0 ? (
          <div className="text-muted text-[13px] text-center py-8 leading-relaxed">
            Click a suggestion or type a question below.
          </div>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              label={msg.label}
              isStreaming={msg.isStreaming}
            />
          ))
        )}
      </div>
      <div className="px-2.5 py-2.5 border-t border-border flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          disabled={isChatStreaming}
          className="flex-1 bg-panel-2 border border-border text-foreground px-2.5 py-2 rounded-md text-[13px] outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isChatStreaming || !input.trim()}
          className="bg-accent text-black border-none px-3.5 py-2 rounded-md cursor-pointer text-[13px] font-medium disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
