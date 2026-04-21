import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

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

    const defaultPrompt = `You are an AI meeting assistant analyzing a live conversation. Based on the transcript below, generate exactly 3 suggestions that would be most useful RIGHT NOW.

 Guidelines:
 - Mix suggestion types based on what the conversation needs:
   - "question": A smart follow-up question the user should ask
   - "talking": A talking point, data, or insight the user can bring up
   - "answer": An answer to a question that was just asked in the conversation
   - "fact": A fact-check or verification of a claim made in the conversation
 - If someone just asked a question → prioritize an "answer"
 - If someone made a factual claim → prioritize a "fact" check
 - If the conversation is flowing → offer "question" and "talking" points
 - Keep each suggestion concise (1-2 sentences) but immediately useful
 - The preview text alone should deliver value
${summary ? `\nPrevious conversation context:\n${summary}\n` : ""}
Transcript:
${transcriptText}

Respond with JSON: { "suggestions": [{ "type": "question|talking|answer|fact", "text": "..." }, ...] }`

    const systemPrompt = customPrompt
      ? customPrompt
          .replace("{summary}", summary ? `Previous conversation context:\n${summary}` : "")
          .replace("{transcript}", transcriptText)
      : defaultPrompt

    const groq = new Groq({ apiKey })
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
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
