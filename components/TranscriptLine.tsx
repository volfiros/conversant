"use client"

interface TranscriptLineProps {
  text: string
  timestamp: number
}

export function TranscriptLine({ text, timestamp }: TranscriptLineProps) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

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
