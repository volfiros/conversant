"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { getDefaultSettings } from "@/lib/store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Settings, Eye, EyeOff, RotateCcw } from "lucide-react"

export function SettingsModal({ onRegisterTrigger }: { onRegisterTrigger?: (openFn: () => void) => void }) {
  const { settings, updateSettings, resetSettings } = useAppStore()
  const [open, setOpen] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    if (onRegisterTrigger) {
      onRegisterTrigger(() => setOpen(true))
    }
  }, [onRegisterTrigger])

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(useAppStore.getState().settings)
    }
    setOpen(isOpen)
  }

  const handleSave = () => {
    updateSettings(localSettings)
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const handleReset = () => {
    const defaults = getDefaultSettings()
    setLocalSettings(defaults)
    resetSettings()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-white/5 transition-all duration-150">
          <Settings size={16} className="text-white/40 hover:text-white transition-colors duration-150" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-panel shadow-2xl text-white max-w-lg max-h-[85vh] overflow-y-auto border-white/[0.15] animate-slide-down" style={{ background: "rgba(0, 0, 0, 0.75)" }}>
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-outfit)] text-white">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
              Groq API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={localSettings.apiKey}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, apiKey: e.target.value })
                }
                placeholder="gsk_..."
                className="bg-white/[0.03] border-white/[0.08] text-white pr-10 focus:border-accent/50 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-all duration-150"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
              Suggestion Prompt
            </label>
            <Textarea
              value={localSettings.suggestionPrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, suggestionPrompt: e.target.value })
              }
              rows={6}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs focus:border-accent/50 transition-all duration-150"
            />
          </div>

          <div>
            <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
              Chat Prompt
            </label>
            <Textarea
              value={localSettings.chatPrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, chatPrompt: e.target.value })
              }
              rows={6}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs focus:border-accent/50 transition-all duration-150"
            />
          </div>

          <div>
            <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
              Summarize Prompt
            </label>
            <Textarea
              value={localSettings.summarizePrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, summarizePrompt: e.target.value })
              }
              rows={4}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs focus:border-accent/50 transition-all duration-150"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
                Suggestion Context Window
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={localSettings.suggestionContextWindow}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    suggestionContextWindow: parseInt(e.target.value) || 10,
                  })
                }
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-accent/50 transition-all duration-150"
              />
            </div>
            <div>
              <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
                Chat Context Window
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={localSettings.chatContextWindow}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    chatContextWindow: parseInt(e.target.value) || 20,
                  })
                }
                className="bg-white/[0.03] border-white/[0.08] text-white focus:border-accent/50 transition-all duration-150"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all duration-150"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset to Defaults
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-accent text-black hover:bg-accent/90 transition-all duration-150">
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
