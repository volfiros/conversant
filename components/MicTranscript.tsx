"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAppStore } from "@/lib/store"
import { getSupportedMimeType, createMediaRecorder } from "@/lib/audio"
import { TranscriptLine } from "./TranscriptLine"
import { toast } from "sonner"
import { Mic, MicOff } from "lucide-react"

async function transcribeBlob(
  blob: Blob,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const formData = new FormData()
  formData.append("file", blob, `audio.${blob.type.includes("webm") ? "webm" : "mp4"}`)
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

  const bodyRef = useRef<HTMLDivElement>(null)
  const queueRef = useRef<Blob[]>([])
  const processingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    while (queueRef.current.length > 0) {
      const blob = queueRef.current.shift()!
      try {
        const text = await transcribeBlob(blob, settings.apiKey, abortRef.current?.signal)
        if (text.trim()) {
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

      const recorder = createMediaRecorder(stream, (blob) => {
        queueRef.current.push(blob)
        processQueue()
      })

      recorder.start(30000)
      setMediaRecorder(recorder)
      startRecording()
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Please allow access.")
      } else {
        toast.error("Failed to start recording")
      }
    }
  }, [isRecording, settings.apiKey, startRecording, stopRecording, setMediaRecorder, setAbortController, processQueue])

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="bg-panel border border-border rounded-[10px] flex flex-col overflow-hidden min-h-0">
      <header className="px-3.5 py-2.5 border-b border-border text-xs uppercase tracking-wider text-muted flex justify-between items-center">
        <span>1. Mic & Transcript</span>
        <span>{isRecording ? "● recording" : "idle"}</span>
      </header>
      <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-border">
        <button
          onClick={handleToggle}
          className={`w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center text-lg transition-colors ${
            isRecording
              ? "bg-danger text-white animate-pulse-ring"
              : "bg-accent text-black"
          }`}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <div className="text-[13px] text-muted">
          {isRecording
            ? "Listening… transcript updates every 30s."
            : "Click mic to start. Transcript appends every ~30s."}
        </div>
      </div>
      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto p-3.5"
      >
        {transcript.length === 0 ? (
          <div className="text-muted text-[13px] text-center py-8 leading-relaxed">
            No transcript yet — start the mic.
          </div>
        ) : (
          transcript.map((line) => (
            <TranscriptLine key={line.id} text={line.text} timestamp={line.timestamp} />
          ))
        )}
      </div>
    </div>
  )
}
