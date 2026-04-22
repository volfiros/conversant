"use client"

import type { SuggestionType } from "@/lib/types"
import { SUGGESTION_TYPE_LABELS } from "@/lib/types"

const TYPE_COLORS: Record<SuggestionType, { bg: string; text: string }> = {
  question: { bg: "bg-accent/15", text: "text-accent" },
  talking: { bg: "bg-[#b388ff]/15", text: "text-[#b388ff]" },
  answer: { bg: "bg-good/15", text: "text-good" },
  fact: { bg: "bg-warn/15", text: "text-warn" },
}

interface SuggestionCardProps {
  type: SuggestionType
  text: string
  isFresh: boolean
  isStale: boolean
  onClick: () => void
}

export function SuggestionCard({ type, text, isFresh, isStale, onClick }: SuggestionCardProps) {
  const colors = TYPE_COLORS[type]

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg p-3 transition-all duration-150 hover-lift press-effect bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] ${
        isFresh ? "border-accent/20" : ""
      } ${isStale ? "opacity-40" : ""} border`}
    >
      <span
        className={`font-[family-name:var(--font-mono)] inline-block text-[9px] tracking-[0.05em] uppercase rounded px-2 py-0.5 mb-1.5 ${colors.bg} ${colors.text}`}
      >
        {SUGGESTION_TYPE_LABELS[type]}
      </span>
      <div className="font-[family-name:var(--font-outfit)] text-sm font-medium leading-snug text-white/90">
        {text}
      </div>
    </div>
  )
}
