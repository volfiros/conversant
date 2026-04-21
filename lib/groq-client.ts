import Groq from "groq-sdk"

export function createGroqClient(apiKey: string): Groq {
  return new Groq({ apiKey, dangerouslyAllowBrowser: false })
}
