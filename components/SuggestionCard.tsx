"use client"

import { useAppStore } from "@/lib/store"
import type { SuggestionType } from "@/lib/types"
import { SUGGESTION_TYPE_LABELS } from "@/lib/types"

const TYPE_COLORS: Record<SuggestionType, { bg: string; text: string }> = {
  question: { bg: "bg-accent/15", text: "text-accent" },
  talking: { bg: "bg-accent-2/15", text: "text-accent-2" },
  answer: { bg: "bg-good/15", text: "text-good" },
  fact: { bg: "bg-warn/15", text: "text-warn" },
}

interface SuggestionCardProps {
  id: string
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
      className={`border rounded-lg p-3 cursor-pointer transition-all duration-150 hover:-translate-y-px hover:border-accent ${
        isFresh ? "border-accent" : "border-border"
      } ${isStale ? "opacity-55" : ""} bg-panel-2`}
    >
      <span
        className={`inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 ${colors.bg} ${colors.text}`}
      >
        {SUGGESTION_TYPE_LABELS[type]}
      </span>
      <div className="text-sm font-medium leading-snug">{text}</div>
    </div>
  )
}
