import { NextRequest } from "next/server"
import Groq from "groq-sdk"
import { MODEL_LLM, LLM_CONFIG, DEFAULT_CONTEXT } from "@/lib/config"
import { DEFAULT_CHAT_PROMPT } from "@/lib/prompts"
import { interpolateTemplate } from "@/lib/template"
import { chatRequestSchema } from "@/lib/schemas"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) return apiError("Missing API key", 401)

  try {
    const body = await req.json()
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("Invalid request: " + parsed.error.issues.map((i) => i.message).join(", "), 400)
    }
    const { question, transcript, chatHistory, customPrompt, contextWindow, summary } = parsed.data

    const window = contextWindow || DEFAULT_CONTEXT.chatWindow
    const recentTranscript = transcript.slice(-window)
    const transcriptText = recentTranscript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const template = customPrompt || DEFAULT_CHAT_PROMPT
    const systemPrompt = interpolateTemplate(template, {
      summary: summary ? `Previous conversation context:\n${summary}` : "",
      transcript: transcriptText,
    })

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: m.label ? `[${m.label}] ${m.content}` : m.content,
      })),
      { role: "user", content: question },
    ]

    const groq = new Groq({ apiKey })
    const stream = await groq.chat.completions.create({
      model: MODEL_LLM,
      messages,
      stream: true,
      temperature: LLM_CONFIG.chat.temperature,
      max_tokens: LLM_CONFIG.chat.maxTokens,
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
    return apiError(message, status)
  }
}
