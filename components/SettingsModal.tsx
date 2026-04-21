"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { DEFAULT_SUGGESTION_PROMPT, DEFAULT_CHAT_PROMPT } from "@/lib/prompts"
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

export function SettingsModal() {
  const { settings, updateSettings, resetSettings } = useAppStore()
  const [open, setOpen] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)

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

  const handleReset = () => {
    const defaults = {
      ...settings,
      suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
      chatPrompt: DEFAULT_CHAT_PROMPT,
      suggestionContextWindow: 10,
      chatContextWindow: 20,
    }
    setLocalSettings(defaults)
    resetSettings()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="p-2 rounded-md hover:bg-panel-2 transition-colors">
          <Settings size={16} className="text-muted" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-panel border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
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
                className="bg-panel-2 border-border text-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
              Suggestion Prompt
            </label>
            <Textarea
              value={localSettings.suggestionPrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, suggestionPrompt: e.target.value })
              }
              rows={6}
              className="bg-panel-2 border-border text-foreground text-xs"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
              Chat Prompt
            </label>
            <Textarea
              value={localSettings.chatPrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, chatPrompt: e.target.value })
              }
              rows={6}
              className="bg-panel-2 border-border text-foreground text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
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
                className="bg-panel-2 border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted mb-1.5 block">
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
                className="bg-panel-2 border-border text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted hover:text-foreground"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset to Defaults
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
