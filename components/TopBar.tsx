"use client"

import { useAppStore } from "@/lib/store"
import { SettingsModal } from "./SettingsModal"
import { ExportButton } from "./ExportButton"

export function TopBar() {
  const { isRecording, batchCounter } = useAppStore()

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 animate-fade-in" style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(12px)" }}>
      <h1 className="font-[family-name:var(--font-outfit)] text-xs font-semibold uppercase tracking-[0.2em]">
        Conversant
      </h1>
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
        <SettingsModal />
      </div>
    </div>
  )
}
