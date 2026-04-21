import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  try {
    const groq = new Groq({ apiKey })
    await groq.models.list()
    return NextResponse.json({ valid: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid API key"
    return NextResponse.json({ valid: false, error: message }, { status: 401 })
  }
}
