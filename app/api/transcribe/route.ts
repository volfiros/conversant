import { NextRequest } from "next/server"
import Groq from "groq-sdk"
import { MODEL_WHISPER } from "@/lib/config"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) return apiError("Missing API key", 401)

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return apiError("No audio file provided", 400)
    }

    const bytes = await file.arrayBuffer()
    const audioFile = new File([bytes], file.name || "audio.webm", { type: file.type || "audio/webm" })

    const groq = new Groq({ apiKey })
    const result = await groq.audio.transcriptions.create({
      model: MODEL_WHISPER,
      file: audioFile,
    })

    return Response.json({ text: result.text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transcription failed"
    const status = (error as { status?: number })?.status || 500
    return apiError(message, status)
  }
}
