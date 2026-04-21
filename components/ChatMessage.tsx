"use client"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  label?: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, label, isStreaming }: ChatMessageProps) {
  return (
    <div className={`mb-3.5 animate-fadein ${role === "user" ? "user" : ""}`}>
      <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
        {role === "user"
          ? label
            ? `You · ${label}`
            : "You"
          : "Assistant"}
      </div>
      <div
        className={`border rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${
          role === "user"
            ? "bg-accent/8 border-accent/30"
            : "bg-panel-2 border-border"
        }`}
      >
        {content}
        {isStreaming && <span className="inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 align-middle animate-blink" />}
      </div>
    </div>
  )
}
