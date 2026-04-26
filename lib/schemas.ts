import { z } from "zod"

const transcriptLineSchema = z.object({
  text: z.string(),
  timestamp: z.number(),
})

export const chatRequestSchema = z.object({
  question: z.string().min(1),
  transcript: z.array(transcriptLineSchema),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        label: z.string().optional(),
      })
    )
    .optional(),
  customPrompt: z.string().optional(),
  contextWindow: z.number().int().min(1).max(100).optional(),
  summary: z.string().optional(),
  summarizePrompt: z.string().optional(),
})

export const suggestionsRequestSchema = z.object({
  transcript: z.array(transcriptLineSchema),
  customPrompt: z.string().optional(),
  contextWindow: z.number().int().min(1).max(50).optional(),
  summary: z.string().optional(),
})

export const summarizeRequestSchema = z.object({
  transcript: z.array(transcriptLineSchema),
  customPrompt: z.string().optional(),
})

