const HALLUCINATION_PHRASES = [
  "thank you",
  "thank you for watching",
  "thanks for watching",
  "subscribe",
  "subscribe to my channel",
  "please subscribe",
  "see you next time",
  "see you later",
  "bye",
  "goodbye",
  "welcome back",
  "hey guys",
  "what's up",
]

const SINGLE_WORD_SHORT = ["you", "the", "uh", "um", "hmm", "mm", "oh", "ah", "ha", "hi"]

export function isHallucination(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return true

  if (SINGLE_WORD_SHORT.includes(normalized)) return true

  if (normalized.split(/\s+/).length === 1 && normalized.length <= 2) return true

  for (const phrase of HALLUCINATION_PHRASES) {
    if (normalized === phrase || normalized.includes(phrase)) return true
  }

  return false
}
