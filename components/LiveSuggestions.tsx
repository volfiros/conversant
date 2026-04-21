"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import { useScrollToBottom } from "@/lib/useScrollToBottom"
import { SuggestionCard } from "./SuggestionCard"
import type { Suggestion, SuggestionBatch } from "@/lib/types"
import { DEFAULT_SUGGESTION_PROMPT } from "@/lib/prompts"
import { toast } from "sonner"
import { RefreshCw, ChevronDown } from "lucide-react"

async function fetchSummary(
  apiKey: string,
  transcript: { text: string; timestamp: number }[],
  signal?: AbortSignal
): Promise<string> {
  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-groq-api-key": apiKey,
      },
      body: JSON.stringify({ transcript }),
      signal,
    })
    if (!res.ok) return ""
    const data = await res.json()
    return data.summary || ""
  } catch {
    return ""
  }
}

async function fetchSuggestions(
  apiKey: string,
  transcript: { text: string; timestamp: number }[],
  customPrompt: string | undefined,
  contextWindow: number,
  summary: string,
  signal?: AbortSignal
): Promise<Suggestion[]> {
  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-groq-api-key": apiKey,
    },
    body: JSON.stringify({ transcript, customPrompt, contextWindow, summary }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Suggestion fetch failed" }))
    throw new Error(err.error || "Suggestion fetch failed")
  }
  const data = await res.json()
  return data.suggestions || []
}

export function LiveSuggestions() {
  const {
    settings,
    transcript,
    isRecording,
    suggestionBatches,
    suggestionLoading,
    countdown,
    batchCounter,
    addSuggestionBatch,
    setSuggestionLoading,
    setCountdown,
    decrementCountdown,
    suggestionAbortController,
    setSuggestionAbortController,
    transcriptSummary,
    setTranscriptSummary,
  } = useAppStore()

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom } =
    useScrollToBottom<HTMLDivElement>([suggestionBatches])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendToChatRef = useRef<((text: string, type: string) => void) | null>(null)
  const [showBanner, setShowBanner] = useState(true)
  const prevTranscriptLen = useRef(-1)

  const doFetch = useCallback(async () => {
    if (transcript.length === 0 || !settings.apiKey) return

    if (suggestionAbortController) {
      suggestionAbortController.abort()
    }
    const controller = new AbortController()
    setSuggestionAbortController(controller)
    setSuggestionLoading(true)

    try {
      const contextWindow = settings.suggestionContextWindow
      const older = transcript.length > contextWindow ? transcript.slice(0, -contextWindow) : []
      const recent = transcript.length > contextWindow ? transcript.slice(-contextWindow) : transcript

      let summary = transcriptSummary
      if (older.length > 0) {
        const fetchedSummary = await fetchSummary(settings.apiKey, older, controller.signal)
        if (fetchedSummary) {
          summary = fetchedSummary
          setTranscriptSummary(fetchedSummary)
        }
      }

      const suggestions = await fetchSuggestions(
        settings.apiKey,
        recent,
        settings.suggestionPrompt !== DEFAULT_SUGGESTION_PROMPT
          ? settings.suggestionPrompt
          : undefined,
        contextWindow,
        summary,
        controller.signal
      )
      if (suggestions.length > 0) {
        const batch: SuggestionBatch = {
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          suggestions: suggestions.map((s) => ({
            ...s,
            id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          })),
          timestamp: Date.now(),
          batchNumber: useAppStore.getState().batchCounter + 1,
        }
        addSuggestionBatch(batch)
        setShowBanner(false)
        setCountdown(30)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      toast.error("Failed to fetch suggestions")
    } finally {
      setSuggestionLoading(false)
    }
  }, [transcript, settings, suggestionAbortController, transcriptSummary, addSuggestionBatch, setSuggestionLoading, setSuggestionAbortController, setTranscriptSummary, setShowBanner, setCountdown])

  useEffect(() => {
    if (transcript.length > prevTranscriptLen.current && prevTranscriptLen.current !== -1) {
      doFetch()
    }
    prevTranscriptLen.current = transcript.length
  }, [transcript, doFetch])

  useEffect(() => {
    if (isRecording && transcript.length > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => {
        useAppStore.getState().decrementCountdown()
      }, 1000)
    }
    if (!isRecording && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [isRecording, transcript.length])

  const handleRefresh = () => {
    setCountdown(30)
    doFetch()
  }

  const setSendToChat = useCallback((fn: (text: string, type: string) => void) => {
    sendToChatRef.current = fn
  }, [])

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden min-h-0 relative animate-fade-in-up stagger-2">
      <header className="px-3.5 py-2.5 border-b border-white/[0.08] flex justify-between items-center">
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          2. Live Suggestions
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          {batchCounter} batch{batchCounter !== 1 ? "es" : ""}
        </span>
      </header>
      <div className="px-3.5 py-2.5 flex gap-2 items-center">
        <button
          onClick={handleRefresh}
          disabled={suggestionLoading}
          className="bg-white/[0.03] border border-white/[0.08] text-white/50 px-3 py-1.5 rounded-md text-xs cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-white transition-all duration-150 disabled:opacity-50 font-[family-name:var(--font-outfit)]"
        >
          <RefreshCw size={12} className={`inline mr-1 ${suggestionLoading ? "animate-spin text-accent" : ""}`} />
          Reload suggestions
        </button>
        <span className="font-[family-name:var(--font-mono)] text-[11px] text-white/40 ml-auto">
          auto-refresh in {countdown}s
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3.5 carrier-scroll"
      >
        {showBanner && suggestionBatches.length === 0 && (
          <div className="bg-accent-dim border border-accent/30 text-white/80 px-3 py-2 text-xs rounded-md mb-3 leading-relaxed animate-fade-in font-[family-name:var(--font-outfit)]">
            On reload (or auto every ~30s), generate <strong>3 fresh suggestions</strong> from
            recent transcript context. New batch appears at the top; older batches push down
            (faded). Each is a tappable card.
          </div>
        )}
        {suggestionBatches.length === 0 ? (
          <div className="font-[family-name:var(--font-outfit)] text-sm text-white/30 text-center py-8 leading-relaxed">
            Suggestions appear here once recording starts.
          </div>
        ) : (
          suggestionBatches.map((batch, batchIdx) => (
            <div key={batch.id} className={batchIdx === 0 ? "animate-fade-in-up" : ""}>
              {batch.suggestions.map((s, sIdx) => (
                <div key={s.id} className={`mb-2 stagger-${Math.min(sIdx + 1, 3)}`}>
                  <SuggestionCard
                    id={s.id}
                    type={s.type}
                    text={s.text}
                    isFresh={batchIdx === 0}
                    isStale={batchIdx > 0}
                    onClick={() => {
                      if (sendToChatRef.current) {
                        sendToChatRef.current(s.text, s.type)
                      }
                      const event = new CustomEvent("suggestion-click", {
                        detail: { text: s.text, type: s.type },
                      })
                      window.dispatchEvent(event)
                    }}
                  />
                </div>
              ))}
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/20 uppercase tracking-[0.1em] text-center py-1.5">
                — Batch {batch.batchNumber} ·{" "}
                {new Date(batch.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                —
              </div>
            </div>
          ))
        )}
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-150 flex items-center justify-center shadow-lg"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  )
}
