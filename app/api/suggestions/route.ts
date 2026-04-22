import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { MODEL_LLM } from "@/lib/constants"
import { DEFAULT_SUGGESTION_PROMPT } from "@/lib/prompts"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { transcript, customPrompt, contextWindow, summary } = body as {
      transcript: { text: string; timestamp: number }[]
      customPrompt?: string
      contextWindow?: number
      summary?: string
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 })
    }

    const window = contextWindow || 10
    const recentTranscript = transcript.slice(-window)
    const transcriptText = recentTranscript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const defaultPrompt = DEFAULT_SUGGESTION_PROMPT
      .replace("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
      .replace("{transcript}", transcriptText)

    const systemPrompt = customPrompt
      ? customPrompt
          .replaceAll("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
          .replaceAll("{transcript}", transcriptText)
      : defaultPrompt

    const groq = new Groq({ apiKey })
    const response = await groq.chat.completions.create({
      model: MODEL_LLM,
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1024,
    })

    const content = response.choices[0]?.message?.content || '{"suggestions":[]}'
    const parsed = JSON.parse(content)

    return NextResponse.json(parsed)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Suggestion generation failed"
    const status = (error as { status?: number })?.status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
