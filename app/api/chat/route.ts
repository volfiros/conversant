import { NextRequest } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401 })
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
      return new Response(JSON.stringify({ error: "No question provided" }), { status: 400 })
    }

    const window = contextWindow || 20
    const recentTranscript = transcript.slice(-window)
    const transcriptText = recentTranscript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const historyText = (chatHistory || [])
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const defaultPrompt = `You are an AI meeting assistant providing detailed, helpful answers during a live conversation.
${summary ? `\nPrevious conversation context:\n${summary}\n` : ""}
Meeting transcript so far:
${transcriptText}

Previous conversation:
${historyText}

The user asks: ${question}

Provide a thorough, well-structured answer. Include specific facts, data, or examples when relevant.`

    const systemPrompt = customPrompt
      ? customPrompt
          .replace("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
          .replace("{transcript}", transcriptText)
          .replace("{chatHistory}", historyText)
          .replace("{question}", question)
      : defaultPrompt

    const groq = new Groq({ apiKey })
    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
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
    return new Response(JSON.stringify({ error: message }), { status })
  }
}
