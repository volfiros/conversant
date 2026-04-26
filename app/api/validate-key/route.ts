import { NextRequest } from "next/server"
import Groq from "groq-sdk"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-groq-api-key")
  if (!apiKey) return apiError("Missing API key", 401)

  try {
    const groq = new Groq({ apiKey })
    await groq.models.list()
    return Response.json({ valid: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid API key"
    return apiError(message, 401)
  }
}
