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

    const defaultPrompt = `You are an AI assistant helping a user in a live conversation. Analyze the transcript and generate exactly 3 HIGHLY RELEVANT suggestions.

IMPORTANT RULES:
- Each suggestion MUST be directly grounded in something said in the transcript
- Do NOT generate generic/small-talk suggestions — every suggestion must reference specific content from the conversation
- Prioritize based on what just happened:
  - If a question was asked → "answer" with a factual, useful response
  - If a claim was made → "fact" with a verification or supporting data
  - If a topic is being discussed → "question" that deepens the discussion
  - If there's an opportunity to contribute → "talking" with a specific insight or data point
- Each suggestion must be 1-2 sentences and immediately actionable

Types:
- "question": A specific follow-up question tied to what was just discussed
- "talking": A concrete talking point with specific data or insight
- "answer": A direct answer to a question asked in the transcript
- "fact": A fact-check with source or verification of a claim made
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
