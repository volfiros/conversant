"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { SettingsModal } from "./SettingsModal"
import { ExportButton } from "./ExportButton"
import { getConnectionStatus } from "@/lib/api-metrics"

const STATUS_COLORS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
} as const

export function TopBar() {
  const { isRecording, batchCounter } = useAppStore()
  const [status, setStatus] = useState(getConnectionStatus())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsTriggerRef = useRef<() => void>(() => {})

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStatus(getConnectionStatus())
    }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const registerSettingsTrigger = useCallback((openFn: () => void) => {
    settingsTriggerRef.current = openFn
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault()
        settingsTriggerRef.current()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 animate-fade-in" style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2">
        <h1 className="font-[family-name:var(--font-outfit)] text-xs font-semibold uppercase tracking-[0.2em]">
          Conversant
        </h1>
        <span
          className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status]}`}
          title={`API: ${status}`}
        />
      </div>
      <div className="flex items-center gap-3">
        {isRecording && (
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-accent animate-breathing">
            ● Recording
          </span>
        )}
        {batchCounter > 0 && (
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
            {batchCounter} batch{batchCounter !== 1 ? "es" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ExportButton />
        <SettingsModal onRegisterTrigger={registerSettingsTrigger} />
      </div>
    </div>
  )
}
