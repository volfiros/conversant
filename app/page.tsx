"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { TopBar } from "@/components/TopBar"
import { MicTranscript } from "@/components/MicTranscript"
import { LiveSuggestions } from "@/components/LiveSuggestions"
import { ChatPanel } from "@/components/ChatPanel"

export default function Home() {
  const router = useRouter()
  const { settings, updateSettings } = useAppStore()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("conversant-settings")
      if (raw) {
        const saved = JSON.parse(raw)
        updateSettings(saved)
        if (!saved.apiKey) {
          router.push("/setup")
          return
        }
      } else {
        router.push("/setup")
        return
      }
    } catch {
      router.push("/setup")
      return
    }
    setChecked(true)
  }, [router, updateSettings])

  if (!checked) return null

  return (
    <div className="h-screen flex flex-col bg-black">
      <TopBar />
      <div className="flex-1 grid grid-cols-3 min-h-0 overflow-hidden">
        <div className="px-2.5 py-3 border-r border-white/[0.08] h-full overflow-hidden">
          <MicTranscript />
        </div>
        <div className="px-2.5 py-3 border-r border-white/[0.08] h-full overflow-hidden">
          <LiveSuggestions />
        </div>
        <div className="px-2.5 py-3 h-full overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
