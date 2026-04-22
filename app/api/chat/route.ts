import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { MODEL_LLM } from "@/lib/constants"
import { DEFAULT_CHAT_PROMPT } from "@/lib/prompts"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { question, transcript, chatHistory, customPrompt, contextWindow, summary } = body as {
      question: string
      transcript: { text: string; timestamp: number }[]
      chatHistory?: { role: string; content: string }[]
      customPrompt?: string
      contextWindow?: number
      summary?: string
    }

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 })
    }

    const window = contextWindow || 20
    const recentTranscript = transcript.slice(-window)
    const transcriptText = recentTranscript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const historyText = (chatHistory || [])
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const defaultPrompt = DEFAULT_CHAT_PROMPT
      .replace("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
      .replace("{transcript}", transcriptText)
      .replace("{chatHistory}", historyText)
      .replace("{question}", question)

    const systemPrompt = customPrompt
      ? customPrompt
          .replaceAll("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
          .replaceAll("{transcript}", transcriptText)
          .replaceAll("{chatHistory}", historyText)
          .replaceAll("{question}", question)
      : defaultPrompt

    const groq = new Groq({ apiKey })
    const stream = await groq.chat.completions.create({
      model: MODEL_LLM,
      messages: [{ role: "user", content: systemPrompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Chat failed"
    const status = (error as { status?: number })?.status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
