"use client"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  label?: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, label, isStreaming }: ChatMessageProps) {
  return (
    <div className={`mb-3.5 ${role === "user" ? "animate-slide-in-left" : "animate-slide-in-right"}`}>
      <div className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-white/40 mb-1">
        {role === "user"
          ? label
            ? `You · ${label}`
            : "You"
          : "Assistant"}
      </div>
      <div
        className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-white text-black rounded-[12px_12px_4px_12px]"
            : "bg-white/5 border border-white/[0.08] rounded-[12px_12px_12px_4px] text-white/90"
        }`}
      >
        <span className="font-[family-name:var(--font-outfit)]">{content}</span>
        {isStreaming && <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle animate-blink" />}
      </div>
    </div>
  )
}
