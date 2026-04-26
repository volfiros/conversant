import { NextRequest } from "next/server"
import Groq from "groq-sdk"
import { MODEL_LLM, LLM_CONFIG } from "@/lib/config"
import { DEFAULT_SUMMARIZE_PROMPT } from "@/lib/prompts"
import { interpolateTemplate } from "@/lib/template"
import { summarizeRequestSchema } from "@/lib/schemas"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) return apiError("Missing API key", 401)

  try {
    const body = await req.json()
    const parsed = summarizeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("Invalid request: " + parsed.error.issues.map((i) => i.message).join(", "), 400)
    }
    const { transcript, customPrompt } = parsed.data

    if (transcript.length === 0) {
      return Response.json({ summary: "" })
    }

    const transcriptText = transcript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const template = customPrompt || DEFAULT_SUMMARIZE_PROMPT
    const prompt = interpolateTemplate(template, { transcript: transcriptText })

    const groq = new Groq({ apiKey })
    const response = await groq.chat.completions.create({
      model: MODEL_LLM,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: LLM_CONFIG.summarize.maxTokens,
      temperature: LLM_CONFIG.summarize.temperature,
    })

    const content = response.choices[0]?.message?.content || '{"summary":""}'
    const parsed_content = JSON.parse(content)

    return Response.json({ summary: parsed_content.summary || "" })
  } catch (error: unknown) {
    console.error("Summarization error:", error)
    return apiError("Summarization failed", 500)
  }
}
