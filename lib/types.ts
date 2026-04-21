export type SuggestionType = "question" | "talking" | "answer" | "fact"

export interface TranscriptLine {
  id: string
  text: string
  timestamp: number
}

export interface Suggestion {
  id: string
  type: SuggestionType
  text: string
}

export interface SuggestionBatch {
  id: string
  suggestions: Suggestion[]
  timestamp: number
  batchNumber: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  label?: string
  timestamp: number
  isStreaming?: boolean
}

export interface Settings {
  apiKey: string
  suggestionPrompt: string
  chatPrompt: string
  suggestionContextWindow: number
  chatContextWindow: number
}

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  question: "Question to ask",
  talking: "Talking point",
  answer: "Answer",
  fact: "Fact-check",
}
