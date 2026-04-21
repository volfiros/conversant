import { create } from "zustand"
import type { TranscriptLine, SuggestionBatch, ChatMessage, Settings } from "./types"
import { DEFAULT_SUGGESTION_PROMPT, DEFAULT_CHAT_PROMPT } from "./prompts"

const STORAGE_KEY = "conversant-settings"

function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return getDefaultSettings()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return getDefaultSettings()
}

function getDefaultSettings(): Settings {
  return {
    apiKey: "",
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    suggestionContextWindow: 10,
    chatContextWindow: 20,
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface AppState {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
  resetSettings: () => void

  isRecording: boolean
  mediaRecorder: MediaRecorder | null
  transcriptionQueue: Blob[]
  isTranscribing: boolean
  abortController: AbortController | null

  startRecording: () => Promise<void>
  stopRecording: () => void
  setMediaRecorder: (r: MediaRecorder | null) => void
  enqueueBlob: (blob: Blob) => void
  setTranscribing: (v: boolean) => void
  setAbortController: (c: AbortController | null) => void

  transcript: TranscriptLine[]
  addTranscriptLine: (text: string) => void

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
  transcriptionQueue: [],
  isTranscribing: false,
  abortController: null,

  startRecording: async () => {
    set({ isRecording: true })
  },
  stopRecording: () => {
    const { mediaRecorder } = get()
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
    set({ isRecording: false, mediaRecorder: null })
  },
  setMediaRecorder: (r) => set({ mediaRecorder: r }),
  enqueueBlob: (blob) => {
    set({ transcriptionQueue: [...get().transcriptionQueue, blob] })
  },
  setTranscribing: (v) => set({ isTranscribing: v }),
  setAbortController: (c) => set({ abortController: c }),

  transcript: [],
  addTranscriptLine: (text) => {
    const line: TranscriptLine = { id: uid(), text, timestamp: Date.now() }
    set({ transcript: [...get().transcript, line] })
  },

  suggestionBatches: [],
  suggestionLoading: false,
  countdown: 30,
  batchCounter: 0,
  suggestionAbortController: null,
  addSuggestionBatch: (batch) => {
    const batches = [batch, ...get().suggestionBatches].slice(0, 20)
    set({ suggestionBatches: batches, batchCounter: get().batchCounter + 1 })
  },
  setSuggestionLoading: (v) => set({ suggestionLoading: v }),
  setCountdown: (v) => set({ countdown: v }),
  decrementCountdown: () => set({ countdown: Math.max(0, get().countdown - 1) }),
  setSuggestionAbortController: (c) => set({ suggestionAbortController: c }),

  chatMessages: [],
  isChatStreaming: false,
  chatAbortController: null,
  addChatMessage: (msg) => {
    set({ chatMessages: [...get().chatMessages, msg].slice(-100) })
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
