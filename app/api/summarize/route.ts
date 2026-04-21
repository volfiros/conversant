import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { transcript } = body as {
      transcript: { text: string; timestamp: number }[]
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ summary: "" })
    }

    const transcriptText = transcript
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`)
      .join("\n")

    const prompt = `Summarize the following conversation transcript into 2-3 concise sentences. Focus on:
- Key topics discussed
- Important decisions or conclusions reached
- Any unresolved questions or action items

Transcript:
${transcriptText}

Respond with JSON: { "summary": "..." }`

    const groq = new Groq({ apiKey })
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 256,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content || '{"summary":""}'
    const parsed = JSON.parse(content)

    return NextResponse.json({ summary: parsed.summary || "" })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Summarization failed"
    return NextResponse.json({ summary: "" })
  }
}
