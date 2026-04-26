import { create } from "zustand"
import type { TranscriptLine, SuggestionBatch, ChatMessage, Settings } from "./types"
import { DEFAULT_SUGGESTION_PROMPT, DEFAULT_DETAIL_PROMPT, DEFAULT_CHAT_PROMPT, DEFAULT_SUMMARIZE_PROMPT } from "./prompts"
import { STORAGE_KEY, DEFAULT_CONTEXT, TIMING, LIMITS } from "./config"

export function getDefaultSettings(): Settings {
  return {
    apiKey: "",
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    detailPrompt: DEFAULT_DETAIL_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    summarizePrompt: DEFAULT_SUMMARIZE_PROMPT,
    suggestionContextWindow: DEFAULT_CONTEXT.suggestionWindow,
    chatContextWindow: DEFAULT_CONTEXT.chatWindow,
  }
}

export function uid(): string {
  return crypto.randomUUID()
}

interface AppState {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
  resetSettings: () => void

  isRecording: boolean
  mediaRecorder: MediaRecorder | null
  abortController: AbortController | null

  startRecording: () => Promise<void>
  stopRecording: () => void
  setMediaRecorder: (r: MediaRecorder | null) => void
  setAbortController: (c: AbortController | null) => void

  transcript: TranscriptLine[]
  addTranscriptLine: (text: string, isSystem?: boolean) => void

  pendingSuggestion: { text: string; type: string } | null
  setPendingSuggestion: (s: { text: string; type: string } | null) => void

  forceTranscribe: (() => void) | null
  setForceTranscribe: (fn: (() => void) | null) => void
  onCountdownZero: (() => void) | null
  setOnCountdownZero: (fn: (() => void) | null) => void

  suggestionBatches: SuggestionBatch[]
  suggestionLoading: boolean
  countdown: number
  batchCounter: number
  suggestionAbortController: AbortController | null
  addSuggestionBatch: (suggestions: SuggestionBatch) => void
  setSuggestionLoading: (v: boolean) => void
  setCountdown: (v: number) => void
  decrementCountdown: () => void
  setSuggestionAbortController: (c: AbortController | null) => void

  chatMessages: ChatMessage[]
  isChatStreaming: boolean
  chatAbortController: AbortController | null
  addChatMessage: (msg: ChatMessage) => void
  updateChatMessage: (id: string, content: string, isStreaming?: boolean) => void
  setChatStreaming: (v: boolean) => void
  setChatAbortController: (c: AbortController | null) => void

  transcriptSummary: string
  setTranscriptSummary: (s: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: getDefaultSettings(),
  updateSettings: (partial) => {
    const updated = { ...get().settings, ...partial }
    set({ settings: updated })
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  },
  resetSettings: () => {
    const defaults = getDefaultSettings()
    set({ settings: defaults })
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)) } catch {}
  },

  isRecording: false,
  mediaRecorder: null,
  abortController: null,

  startRecording: async () => {
    set({ isRecording: true, countdown: TIMING.suggestionCountdownSec })
  },
  stopRecording: () => {
    const { mediaRecorder } = get()
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
    set({ isRecording: false, mediaRecorder: null })
  },
  setMediaRecorder: (r) => set({ mediaRecorder: r }),
  setAbortController: (c) => set({ abortController: c }),

  transcript: [],
  addTranscriptLine: (text, isSystem) => {
    const line: TranscriptLine = { id: uid(), text, timestamp: Date.now(), isSystem }
    set({ transcript: [...get().transcript, line] })
  },

  pendingSuggestion: null,
  setPendingSuggestion: (s) => set({ pendingSuggestion: s }),

  forceTranscribe: null,
  setForceTranscribe: (fn) => set({ forceTranscribe: fn }),
  onCountdownZero: null,
  setOnCountdownZero: (fn) => set({ onCountdownZero: fn }),

  suggestionBatches: [],
  suggestionLoading: false,
  countdown: TIMING.suggestionCountdownSec,
  batchCounter: 0,
  suggestionAbortController: null,
  addSuggestionBatch: (batch) => {
    const batches = [batch, ...get().suggestionBatches].slice(0, LIMITS.maxSuggestionBatches)
    set({ suggestionBatches: batches, batchCounter: get().batchCounter + 1 })
  },
  setSuggestionLoading: (v) => set({ suggestionLoading: v }),
  setCountdown: (v) => set({ countdown: v }),
  decrementCountdown: () => {
    const next = get().countdown - 1
    if (next <= 0) {
      set({ countdown: TIMING.suggestionCountdownSec })
      const cb = get().onCountdownZero
      if (cb) cb()
    } else {
      set({ countdown: next })
    }
  },
  setSuggestionAbortController: (c) => set({ suggestionAbortController: c }),

  chatMessages: [],
  isChatStreaming: false,
  chatAbortController: null,
  addChatMessage: (msg) => {
    set({ chatMessages: [...get().chatMessages, msg].slice(-LIMITS.maxChatMessages) })
  },
  updateChatMessage: (id, content, isStreaming) => {
    set({
      chatMessages: get().chatMessages.map((m) =>
        m.id === id ? { ...m, content, isStreaming: isStreaming ?? m.isStreaming } : m
      ),
    })
  },
  setChatStreaming: (v) => set({ isChatStreaming: v }),
  setChatAbortController: (c) => set({ chatAbortController: c }),

  transcriptSummary: "",
  setTranscriptSummary: (s) => set({ transcriptSummary: s }),
}))
