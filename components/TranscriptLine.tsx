"use client"

import { useMemo } from "react"
import { Info } from "lucide-react"

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

interface TranscriptLineProps {
  text: string
  timestamp: number
  isSystem?: boolean
}

export function TranscriptLineItem({ text, timestamp, isSystem }: TranscriptLineProps) {
  const time = useMemo(() => formatTime(timestamp), [timestamp])

  if (isSystem) {
    return (
      <div className="animate-fade-in-up mb-2.5 leading-relaxed">
        <span className="font-[family-name:var(--font-outfit)] text-xs italic text-white/25 flex items-center gap-1.5">
          <Info size={10} className="text-white/20" />
          {text}
        </span>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up mb-2.5 leading-relaxed">
      <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.05em] uppercase text-white/40 mr-1.5">
        {time}
      </span>
      <span className="font-[family-name:var(--font-outfit)] text-sm text-white/80">
        {text}
      </span>
    </div>
  )
}
