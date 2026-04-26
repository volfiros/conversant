export const MODEL_LLM = "openai/gpt-oss-120b"
export const MODEL_WHISPER = "whisper-large-v3"
export const STORAGE_KEY = "conversant-settings"

export const LLM_CONFIG = {
  chat: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  suggestions: {
    temperature: 0.7,
    maxTokens: 1024,
  },
  summarize: {
    temperature: 0.3,
    maxTokens: 256,
  },
} as const

export const DEFAULT_CONTEXT = {
  suggestionWindow: 10,
  chatWindow: 20,
} as const

export const TIMING = {
  segmentIntervalMs: 30_000,
  suggestionCountdownSec: 30,
  debounceMs: 400,
  queueDepthWarn: 5,
} as const

export const LIMITS = {
  maxChatMessages: 100,
  maxSuggestionBatches: 20,
  minBlobSize: 1024,
} as const

export const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const
