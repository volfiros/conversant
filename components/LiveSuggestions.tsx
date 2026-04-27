"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppStore, uid } from "@/lib/store"
import { useScrollToBottom } from "@/lib/useScrollToBottom"
import { SuggestionCard } from "./SuggestionCard"
import type { Suggestion, SuggestionBatch } from "@/lib/types"
import { DEFAULT_SUGGESTION_PROMPT, DEFAULT_SUMMARIZE_PROMPT } from "@/lib/prompts"
import { TIMING } from "@/lib/config"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { ScrollToBottomButton } from "./ScrollToBottom"
import { trackApiResult } from "@/lib/api-metrics"

async function fetchSummary(
  apiKey: string,
  transcript: { text: string; timestamp: number }[],
  customPrompt?: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-groq-api-key": apiKey,
      },
      body: JSON.stringify({
      transcript: transcript.map(({ text, timestamp }) => ({ text, timestamp })),
      customPrompt,
    }),
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
    body: JSON.stringify({
      transcript: transcript.map(({ text, timestamp }) => ({ text, timestamp })),
      customPrompt,
      contextWindow,
      summary,
    }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Suggestion fetch failed" }))
    throw new Error(err.error || "Suggestion fetch failed")
  }
  const data = await res.json()
  return data.suggestions || []
}

function BatchTimestamp({ timestamp }: { timestamp: number }) {
  const formatted = useMemo(
    () =>
      new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [timestamp]
  )
  return <>{formatted}</>
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
    setSuggestionAbortController,
    transcriptSummary,
    setTranscriptSummary,
    setPendingSuggestion,
    setOnCountdownZero,
  } = useAppStore()

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom } =
    useScrollToBottom<HTMLDivElement>([suggestionBatches])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showBanner, setShowBanner] = useState(true)
  const prevTranscriptLen = useRef(0)

  const doFetch = useCallback(async () => {
    const state = useAppStore.getState()
    const currentTranscript = state.transcript
    const realTranscript = currentTranscript.filter(l => !l.isSystem)
    if (realTranscript.length === 0 || !state.settings.apiKey) return
    if (state.suggestionLoading) return

    const prev = state.suggestionAbortController
    if (prev) prev.abort()
    const controller = new AbortController()
    setSuggestionAbortController(controller)
    setSuggestionLoading(true)

    try {
      const contextWindow = state.settings.suggestionContextWindow
      const older = realTranscript.length > contextWindow ? realTranscript.slice(0, -contextWindow) : []
      const recent = realTranscript.length > contextWindow ? realTranscript.slice(-contextWindow) : realTranscript

      const customPrompt = state.settings.suggestionPrompt !== DEFAULT_SUGGESTION_PROMPT
        ? state.settings.suggestionPrompt
        : undefined

      let summary = state.transcriptSummary

      const suggestionsPromise = fetchSuggestions(
        state.settings.apiKey, recent, customPrompt, contextWindow, summary, controller.signal
      )

      if (older.length > 0) {
        const summaryPromise = fetchSummary(
          state.settings.apiKey,
          older,
          state.settings.summarizePrompt !== DEFAULT_SUMMARIZE_PROMPT ? state.settings.summarizePrompt : undefined,
          controller.signal
        )
        const [summaryResult, suggestions] = await Promise.all([summaryPromise, suggestionsPromise])
        if (summaryResult) {
          summary = summaryResult
          setTranscriptSummary(summaryResult)
        }
        if (suggestions.length > 0) {
          addSuggestionBatch({
            id: uid(),
            suggestions: suggestions.map((s) => ({ ...s, id: uid() })),
            timestamp: Date.now(),
            batchNumber: state.batchCounter + 1,
          })
          setShowBanner(false)
          setCountdown(TIMING.suggestionCountdownSec)
        }
      } else {
        const suggestions = await suggestionsPromise
        if (suggestions.length > 0) {
          addSuggestionBatch({
            id: uid(),
            suggestions: suggestions.map((s) => ({ ...s, id: uid() })),
            timestamp: Date.now(),
            batchNumber: state.batchCounter + 1,
          })
          setShowBanner(false)
          setCountdown(TIMING.suggestionCountdownSec)
        }
      }
      trackApiResult(true)
    } catch (err) {
      trackApiResult(false)
      if (err instanceof Error && err.name === "AbortError") return
      console.error("Suggestion fetch error:", err)
      toast.error("Failed to fetch suggestions")
    } finally {
      setSuggestionLoading(false)
    }
  }, [addSuggestionBatch, setSuggestionLoading, setSuggestionAbortController, setTranscriptSummary, setShowBanner, setCountdown])

  useEffect(() => {
    if (transcript.length > prevTranscriptLen.current) {
      const hasNewRealTranscript = transcript
        .slice(prevTranscriptLen.current)
        .some(line => !line.isSystem)
      if (hasNewRealTranscript) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          doFetch()
        }, TIMING.debounceMs)
      }
    }
    prevTranscriptLen.current = transcript.length
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [transcript, doFetch])

  useEffect(() => {
    if (isRecording && !timerRef.current) {
      timerRef.current = setInterval(() => {
        useAppStore.getState().decrementCountdown()
      }, 1000)
    }
    if (!isRecording && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [isRecording])

  useEffect(() => {
    setOnCountdownZero(() => () => {
      const ft = useAppStore.getState().forceTranscribe
      if (ft) ft()
      setTimeout(() => {
        doFetch()
      }, 2000)
    })
    return () => setOnCountdownZero(null)
  }, [doFetch, setOnCountdownZero])

  const handleRefresh = () => {
    setCountdown(TIMING.suggestionCountdownSec)
    const ft = useAppStore.getState().forceTranscribe
    if (ft && isRecording) {
      ft()
      setTimeout(() => {
        doFetch()
      }, 2000)
    } else {
      doFetch()
    }
  }

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
          suggestionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.08] animate-pulse">
                  <div className="h-3.5 w-20 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-full bg-white/5 rounded mb-1.5" />
                  <div className="h-3 w-2/3 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="font-[family-name:var(--font-outfit)] text-sm text-white/30 text-center py-8 leading-relaxed">
              {isRecording && transcript.length > 0 && transcript.every(l => l.isSystem)
                ? "No new speech detected — suggestions will appear when speech is recognized."
                : "Suggestions appear here once recording starts."}
            </div>
          )
        ) : (
          suggestionBatches.map((batch, batchIdx) => (
            <div key={batch.id} className={batchIdx === 0 ? "animate-fade-in-up" : ""}>
              {batch.suggestions.map((s, sIdx) => (
                <div key={s.id} className={`mb-2 stagger-${Math.min(sIdx + 1, 3)}`}>
                  <SuggestionCard
                    type={s.type}
                    text={s.text}
                    isFresh={batchIdx === 0}
                    isStale={batchIdx > 0}
                    onClick={() => {
                      setPendingSuggestion({ text: s.text, type: s.type })
                    }}
                  />
                </div>
              ))}
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/20 uppercase tracking-[0.1em] text-center py-1.5">
                — Batch {batch.batchNumber} ·{" "}
                <BatchTimestamp timestamp={batch.timestamp} />{" "}
                —
              </div>
            </div>
          ))
        )}
      </div>
      <ScrollToBottomButton show={showScrollButton} onClick={scrollToBottom} className="bottom-4 right-4" />
    </div>
  )
}
