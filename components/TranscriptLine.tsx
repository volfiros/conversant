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
    <div className="text-sm leading-relaxed mb-2.5 text-[#cfd3dc] animate-fadein">
      <span className="text-muted text-[11px] mr-1.5">{time}</span>
      {text}
    </div>
  )
}
