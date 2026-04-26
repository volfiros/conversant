import { NextRequest } from "next/server"
import Groq from "groq-sdk"
import { MODEL_LLM, LLM_CONFIG, DEFAULT_CONTEXT } from "@/lib/config"
import { DEFAULT_SUGGESTION_PROMPT } from "@/lib/prompts"
import { interpolateTemplate } from "@/lib/template"
import { suggestionsRequestSchema } from "@/lib/schemas"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) return apiError("Missing API key", 401)

  try {
    const body = await req.json()
    const parsed = suggestionsRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("Invalid request: " + parsed.error.issues.map((i) => i.message).join(", "), 400)
    }
    const { transcript, customPrompt, contextWindow, summary } = parsed.data

    const window = contextWindow || DEFAULT_CONTEXT.suggestionWindow
    const recentTranscript = transcript.slice(-window)
    const transcriptText = recentTranscript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const template = customPrompt || DEFAULT_SUGGESTION_PROMPT
    const systemPrompt = interpolateTemplate(template, {
      summary: summary ? `Previous conversation context:\n${summary}` : "",
      transcript: transcriptText,
    })

    const groq = new Groq({ apiKey })
    const response = await groq.chat.completions.create({
      model: MODEL_LLM,
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: LLM_CONFIG.suggestions.temperature,
      max_tokens: LLM_CONFIG.suggestions.maxTokens,
    })

    const content = response.choices[0]?.message?.content || '{"suggestions":[]}'
    const parsed_content = JSON.parse(content)

    return Response.json(parsed_content)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Suggestion generation failed"
    const status = (error as { status?: number })?.status || 500
    return apiError(message, status)
  }
}
