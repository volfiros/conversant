"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { SuggestionCard } from "./SuggestionCard"
import type { Suggestion, SuggestionBatch } from "@/lib/types"
import { DEFAULT_SUGGESTION_PROMPT } from "@/lib/prompts"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

async function fetchSuggestions(
  apiKey: string,
  transcript: { text: string; timestamp: number }[],
  customPrompt: string | undefined,
  contextWindow: number,
  signal?: AbortSignal
): Promise<Suggestion[]> {
  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-groq-api-key": apiKey,
    },
    body: JSON.stringify({ transcript, customPrompt, contextWindow }),
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
  } = useAppStore()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendToChatRef = useRef<((text: string, type: string) => void) | null>(null)

  const doFetch = useCallback(async () => {
    if (transcript.length === 0 || !settings.apiKey) return

    if (suggestionAbortController) {
      suggestionAbortController.abort()
    }
    const controller = new AbortController()
    setSuggestionAbortController(controller)
    setSuggestionLoading(true)

    try {
      const suggestions = await fetchSuggestions(
        settings.apiKey,
        transcript,
        settings.suggestionPrompt !== DEFAULT_SUGGESTION_PROMPT
          ? settings.suggestionPrompt
          : undefined,
        settings.suggestionContextWindow,
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
      }
      setCountdown(30)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      toast.error("Failed to fetch suggestions")
    } finally {
      setSuggestionLoading(false)
    }
  }, [transcript, settings, suggestionAbortController])

  useEffect(() => {
    if (isRecording && transcript.length > 0) {
      timerRef.current = setInterval(() => {
        const state = useAppStore.getState()
        if (state.countdown <= 1) {
          doFetch()
        } else {
          state.decrementCountdown()
        }
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording, transcript.length, doFetch])

  const handleRefresh = () => {
    doFetch()
  }

  const setSendToChat = useCallback((fn: (text: string, type: string) => void) => {
    sendToChatRef.current = fn
  }, [])

  return (
    <div className="bg-panel border border-border rounded-[10px] flex flex-col overflow-hidden min-h-0">
      <header className="px-3.5 py-2.5 border-b border-border text-xs uppercase tracking-wider text-muted flex justify-between items-center">
        <span>2. Live Suggestions</span>
        <span>{batchCounter} batch{batchCounter !== 1 ? "es" : ""}</span>
      </header>
      <div className="px-3.5 py-2.5 border-b border-border flex gap-2 items-center">
        <button
          onClick={handleRefresh}
          disabled={suggestionLoading}
          className="bg-panel-2 text-foreground border border-border px-3 py-1.5 rounded-md text-xs cursor-pointer hover:border-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={`inline mr-1 ${suggestionLoading ? "animate-spin" : ""}`} />
          Reload suggestions
        </button>
        <span className="text-[11px] text-muted ml-auto">
          auto-refresh in {countdown}s
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="bg-accent/8 border border-accent/30 text-[#cfd3dc] px-3 py-2 text-xs rounded-md mb-3 leading-relaxed">
          On reload (or auto every ~30s), generate <strong>3 fresh suggestions</strong> from
          recent transcript context. New batch appears at the top; older batches push down
          (faded). Each is a tappable card.
        </div>
        {suggestionBatches.length === 0 ? (
          <div className="text-muted text-[13px] text-center py-8 leading-relaxed">
            Suggestions appear here once recording starts.
          </div>
        ) : (
          suggestionBatches.map((batch, batchIdx) => (
            <div key={batch.id}>
              {batch.suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
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
              ))}
              <div className="text-[10px] text-muted text-center py-1.5 uppercase tracking-wider">
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
    </div>
  )
}
