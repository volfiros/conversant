"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { TopBar } from "@/components/TopBar"
import { MicTranscript } from "@/components/MicTranscript"
import { LiveSuggestions } from "@/components/LiveSuggestions"
import { ChatPanel } from "@/components/ChatPanel"

export default function Home() {
  const { settings, updateSettings } = useAppStore()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("conversant-settings")
      if (raw) {
        const saved = JSON.parse(raw)
        updateSettings(saved)
      }
    } catch {}
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 grid grid-cols-3 gap-3 p-3 min-h-0">
        <MicTranscript />
        <LiveSuggestions />
        <ChatPanel />
      </div>
    </div>
  )
}
