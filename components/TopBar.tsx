"use client"

import { useAppStore } from "@/lib/store"
import { SettingsModal } from "./SettingsModal"
import { ExportButton } from "./ExportButton"

export function TopBar() {
  const { isRecording, batchCounter } = useAppStore()

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-panel">
      <h1 className="text-sm font-semibold tracking-wide">Conversant</h1>
      <div className="text-xs text-muted">
        {isRecording && <span className="text-danger mr-2">● Recording</span>}
        {batchCounter > 0 && <span>{batchCounter} batch{batchCounter !== 1 ? "es" : ""}</span>}
      </div>
      <div className="flex items-center gap-1">
        <ExportButton />
        <SettingsModal />
      </div>
    </div>
  )
}
