"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { STORAGE_KEY } from "@/lib/config"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const { updateSettings } = useAppStore()
  const [key, setKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.apiKey) {
          router.push("/")
          return
        }
      }
    } catch {}
    setChecked(true)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!key.trim()) {
      setError("Please enter an API key.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "x-groq-api-key": key.trim() },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Invalid API key. Please check and try again.")
        setLoading(false)
        return
      }

      updateSettings({ apiKey: key.trim() })
      router.push("/")
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  if (!checked) return null

  return (
    <div className="h-screen flex items-center justify-center bg-black px-4">
      <div className="glass-panel w-full max-w-sm p-8 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-semibold text-white mb-2">
            Conversant
          </h1>
          <p className="text-white/40 text-sm">
            Enter your Groq API key to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5 block">
              Groq API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="gsk_..."
                disabled={loading}
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
            {error && (
              <p className="text-danger text-xs mt-2">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-black hover:bg-accent/90 transition-all duration-150"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : null}
            Get Started
          </Button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          Get your API key at{" "}
          <a
            href="https://console.groq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/70 hover:text-accent transition-colors duration-150"
          >
            console.groq.com
          </a>
        </p>
      </div>
    </div>
  )
}
