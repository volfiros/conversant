"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppStore, uid } from "@/lib/store"
import { useScrollToBottom } from "@/lib/useScrollToBottom"
import { ChatMessage } from "./ChatMessage"
import { SUGGESTION_TYPE_LABELS } from "@/lib/types"
import type { SuggestionType } from "@/lib/types"
import { toast } from "sonner"
import { Send, ChevronDown } from "lucide-react"

async function streamChat(
  apiKey: string,
  question: string,
  transcript: { text: string; timestamp: number }[],
  chatHistory: { role: string; content: string }[],
  customPrompt: string | undefined,
  contextWindow: number,
  summary: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-groq-api-key": apiKey,
    },
    body: JSON.stringify({ question, transcript, chatHistory, customPrompt, contextWindow, summary }),
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
    transcriptSummary,
    pendingSuggestion,
    setPendingSuggestion,
  } = useAppStore()

  const [input, setInput] = useState("")
  const streamingIdRef = useRef<string | null>(null)

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom } =
    useScrollToBottom<HTMLDivElement>([chatMessages])

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
      id: uid(),
      role: "user" as const,
      content: text,
      label: suggestionType ? SUGGESTION_TYPE_LABELS[suggestionType as SuggestionType] : undefined,
      timestamp: Date.now(),
    }
    addChatMessage(userMsg)
    setInput("")

    const assistantId = uid()
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
        transcriptSummary,
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
      console.error("Chat streaming error:", err)
      toast.error("Chat streaming failed")
      updateChatMessage(assistantId, accumulated || "Failed to get response.", false)
    } finally {
      setChatStreaming(false)
      streamingIdRef.current = null
    }
  }, [settings, transcript, chatMessages, chatAbortController, transcriptSummary, addChatMessage, updateChatMessage, setChatStreaming, setChatAbortController])

  useEffect(() => {
    if (pendingSuggestion) {
      handleSend(pendingSuggestion.text, pendingSuggestion.type)
      setPendingSuggestion(null)
    }
  }, [pendingSuggestion, handleSend, setPendingSuggestion])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden min-h-0 relative animate-fade-in-up stagger-3">
      <header className="px-3.5 py-2.5 border-b border-white/[0.08] flex justify-between items-center">
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          3. Chat (detailed answers)
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          session-only
        </span>
      </header>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3.5 carrier-scroll"
      >
        <div className="bg-accent-dim border border-accent/30 text-white/80 px-3 py-2 text-xs rounded-md mb-3 leading-relaxed font-[family-name:var(--font-outfit)]">
          Clicking a suggestion adds it to this chat and streams a detailed answer.
          You can also type questions directly. One continuous chat per session.
        </div>
        {chatMessages.length === 0 ? (
          <div className="font-[family-name:var(--font-outfit)] text-sm text-white/30 text-center py-8 leading-relaxed">
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
        {isChatStreaming && (
          <div className="flex gap-1.5 items-center py-2 px-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce-dot-1" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce-dot-2" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce-dot-3" />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2.5 border-t border-white/[0.08] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          disabled={isChatStreaming}
          className="flex-1 bg-white/[0.03] border border-white/[0.08] text-white px-2.5 py-2 rounded-lg text-sm outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all duration-150 font-[family-name:var(--font-outfit)] placeholder:text-white/30 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isChatStreaming || !input.trim()}
          className={`border-none px-3.5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-150 disabled:opacity-50 ${
            input.trim() ? "bg-accent text-black" : "bg-white/[0.03] text-white/30"
          }`}
        >
          <Send size={14} />
        </button>
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-16 right-4 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-150 flex items-center justify-center shadow-lg"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  )
}
