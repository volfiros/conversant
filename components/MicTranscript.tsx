"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { useScrollToBottom } from "@/lib/useScrollToBottom"
import { getSupportedMimeType, createMediaRecorder } from "@/lib/audio"
import { TranscriptLineItem } from "./TranscriptLine"
import { isHallucination } from "@/lib/transcribe-filter"
import { toast } from "sonner"
import { Mic, MicOff, ChevronDown } from "lucide-react"

function getAudioExtension(blob: Blob): string {
  const type = blob.type.toLowerCase()
  if (type.includes("webm")) return "webm"
  if (type.includes("ogg")) return "ogg"
  if (type.includes("mp4") || type.includes("m4a")) return "m4a"
  if (type.includes("mpeg")) return "mp3"
  return "webm"
}

async function transcribeBlob(
  blob: Blob,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const formData = new FormData()
  const ext = getAudioExtension(blob)
  formData.append("file", blob, `audio.${ext}`)
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "x-groq-api-key": apiKey },
    body: formData,
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Transcription failed" }))
    throw new Error(err.error || "Transcription failed")
  }
  const data = await res.json()
  return data.text
}

export function MicTranscript() {
  const {
    isRecording,
    settings,
    transcript,
    addTranscriptLine,
    startRecording,
    stopRecording,
    setMediaRecorder,
    setAbortController,
  } = useAppStore()

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom } =
    useScrollToBottom<HTMLDivElement>([transcript])

  const queueRef = useRef<Blob[]>([])
  const processingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    return () => {
      if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current)
        segmentTimerRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    while (queueRef.current.length > 0) {
      const blob = queueRef.current.shift()!
      try {
        const text = await transcribeBlob(blob, settings.apiKey, abortRef.current?.signal)
        if (!text.trim() || isHallucination(text.trim())) {
          addTranscriptLine("No speech detected in this segment", true)
        } else {
          addTranscriptLine(text.trim())
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") break
        console.error("Transcription error:", err)
      }
    }

    processingRef.current = false
  }, [settings.apiKey, addTranscriptLine])

  const handleToggle = useCallback(async () => {
    if (isRecording) {
      stopRecording()
      if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current)
        segmentTimerRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      return
    }

    if (!settings.apiKey) {
      toast.error("Please set your Groq API key in Settings")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getSupportedMimeType()
      if (!mimeType) {
        toast.error("No supported audio format found")
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const abortController = new AbortController()
      abortRef.current = abortController
      setAbortController(abortController)

      const makeRecorder = (): MediaRecorder => {
        const r = createMediaRecorder(stream, (blob) => {
          queueRef.current.push(blob)
          processQueue()
        })
        r.start()
        return r
      }

      const recorder = makeRecorder()
      recorderRef.current = recorder
      setMediaRecorder(recorder)
      startRecording()

      segmentTimerRef.current = setInterval(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") {
          recorderRef.current.stop()
          const next = makeRecorder()
          recorderRef.current = next
          setMediaRecorder(next)
        }
      }, 30000)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Please allow access.")
      } else {
        toast.error("Failed to start recording")
      }
    }
  }, [isRecording, settings.apiKey, startRecording, stopRecording, setMediaRecorder, setAbortController, processQueue])

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden min-h-0 relative animate-fade-in-up stagger-1">
      <header className="px-3.5 py-2.5 border-b border-white/[0.08] flex justify-between items-center">
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          1. Mic & Transcript
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.15em] uppercase text-white/40">
          {isRecording ? "● recording" : "idle"}
        </span>
      </header>
      <div className="flex items-center gap-2.5 px-3.5 py-3.5">
        <button
          onClick={handleToggle}
          className={`w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center text-lg transition-all duration-300 ${
            isRecording
              ? "bg-danger text-white animate-ripple"
              : "bg-accent text-black"
          }`}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <div className="font-[family-name:var(--font-outfit)] text-sm text-white/50">
          {isRecording
            ? "Listening… transcript updates every 30s."
            : "Click mic to start. Transcript appends every ~30s."}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3.5 carrier-scroll"
      >
        {transcript.length === 0 ? (
          <div className="font-[family-name:var(--font-outfit)] text-sm text-white/30 text-center py-8 leading-relaxed">
            No transcript yet — start the mic.
          </div>
        ) : (
          transcript.map((line, idx) => (
            <div key={line.id} className={`stagger-${Math.min(idx + 1, 5)}`}>
              <TranscriptLineItem text={line.text} timestamp={line.timestamp} isSystem={line.isSystem} />
            </div>
          ))
        )}
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-150 flex items-center justify-center shadow-lg"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  )
}
