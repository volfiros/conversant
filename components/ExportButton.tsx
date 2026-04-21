"use client"

import { useAppStore } from "@/lib/store"
import { Download } from "lucide-react"

export function ExportButton() {
  const { transcript, suggestionBatches, chatMessages } = useAppStore()

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript: transcript.map((l) => ({
        timestamp: new Date(l.timestamp).toISOString(),
        text: l.text,
      })),
      suggestionBatches: suggestionBatches.map((b) => ({
        batchNumber: b.batchNumber,
        timestamp: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions.map((s) => ({ type: s.type, text: s.text })),
      })),
      chat: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversant-session-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="p-2 rounded-lg hover:bg-white/5 transition-all duration-150"
      title="Export session"
    >
      <Download size={16} className="text-white/40 hover:text-white transition-colors duration-150" />
    </button>
  )
}
