import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { MODEL_WHISPER } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const audioFile = new File([bytes], file.name || "audio.webm", { type: file.type || "audio/webm" })

    const groq = new Groq({ apiKey })
    const result = await groq.audio.transcriptions.create({
      model: MODEL_WHISPER,
      file: audioFile,
    })

    return NextResponse.json({ text: result.text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transcription failed"
    const status = (error as { status?: number })?.status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
