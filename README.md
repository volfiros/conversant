# Conversant

A real-time AI meeting copilot that listens to your microphone and surfaces live suggestions — questions to ask, talking points, answers, and fact-checks.

Live at [conversant.vercel.app](https://conversant.vercel.app)

## Quick Start

1. Install dependencies:
   ```
   bun install
   ```

2. Start the dev server:
   ```
   bun dev
   ```

3. Open http://localhost:3000 in your browser.

4. You will be prompted to enter a Groq API key. Get one at https://console.groq.com/keys.

5. Click the mic button to start recording. Transcript and suggestions will begin appearing.

## How It Works

### Layout

Three columns:

- **Left** - Microphone control and live transcript. Audio is captured in 30-second segments and sent to Whisper for transcription.
- **Middle** - Live suggestions. Every 30 seconds (or on manual refresh), 3 new suggestion cards appear at the top. Older batches fade below them.
- **Right** - Chat panel. Clicking a suggestion sends it here with a detailed answer. You can also type questions directly.

### Audio Pipeline

The app uses the browser's `MediaRecorder` API to capture audio from the microphone. Audio is chunked into 30-second segments. Each segment is sent to Groq's Whisper Large V3 endpoint for transcription. Transcripts are filtered for common Whisper hallucinations (YouTube-style filler like "thank you for watching" and single-word junk like "uh" and "um").

The transcription queue processes segments one at a time to avoid rate limiting. If the queue backs up beyond 5 segments, a warning is logged.

### Suggestion Generation

Every 30 seconds while recording, or when the user hits the refresh button:

1. Current audio segment is finalized and sent for transcription.
2. The recent transcript (configurable, default last 10 lines) is sent to the suggestion model.
3. If there is older transcript beyond the context window, it gets summarized into 2-3 sentences and passed alongside the recent lines for context.
4. The model returns exactly 3 suggestions, each with a type and preview text.

The suggestion types are:

| Type | Color | When it appears |
|------|-------|-----------------|
| Question to ask | Blue | When a topic is being discussed and a follow-up would deepen it |
| Talking point | Purple | When there is an opportunity to contribute a specific insight |
| Answer | Green | When someone asked a question in the transcript |
| Fact-check | Yellow | When a claim was made that can be verified |

The prompt instructs the model to prioritize based on what just happened in the conversation. If someone asked a question, it should produce an answer. If someone made a claim, it should fact-check it. The mix adapts to context rather than always producing one of each type.

### Chat / Detailed Answers

There are two separate prompts:

- **Detail prompt** - Used when a suggestion card is clicked. Produces a longer, more thorough answer with actionable next steps, specific data, and reasoning.
- **Chat prompt** - Used when the user types a question manually. Still has full transcript context but is tuned for general Q&A rather than expanding on a specific suggestion.

Both use the full transcript context (configurable, default last 20 lines) plus the compressed summary of older conversation. Chat history (last 20 messages) is also included so follow-up questions work.

Responses stream in via server-sent events. The UI uses requestAnimationFrame batching to throttle DOM updates during streaming, keeping things smooth even on longer responses.

### Context Compression

When the transcript grows beyond the suggestion context window (default 10 lines), older lines are summarized into 2-3 sentences. This summary runs in parallel with the suggestion fetch so it does not add latency. The summary is cached and only regenerated when older transcript content changes.

### Export

The export button in the top bar downloads a JSON file containing the full transcript with timestamps, all suggestion batches with timestamps, and the complete chat history with timestamps. This is useful for reviewing a session after the fact.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Server-side API routes for Groq calls keep the API key off the client wire |
| Language | TypeScript | Type safety across the full stack |
| Runtime | Bun | Fast installs and dev server |
| State | Zustand | Lightweight, no boilerplate, persists settings to localStorage |
| Styling | Tailwind CSS v4 | Utility-first, fast to iterate on layout |
| UI Components | shadcn/ui + Radix | Accessible primitives, customizable |
| AI SDK | groq-sdk | Official Groq client for transcription and chat completions |
| Streaming | Server-Sent Events | Simple, reliable, works without WebSockets |
| Validation | Zod | Runtime request validation on all API routes |
| Markdown | react-markdown + remark-gfm + rehighlight | Renders formatted answers in chat |

## Models

Everything runs through Groq:

- **Transcription**: Whisper Large V3
- **Suggestions**: GPT-OSS 120B (temperature 0.7, max 1024 tokens)
- **Chat/Detailed answers**: GPT-OSS 120B (temperature 0.7, max 2048 tokens, streaming)
- **Summarization**: GPT-OSS 120B (temperature 0.3, max 256 tokens)

## Settings

Press the gear icon or Cmd/Ctrl+, to open settings. Everything is configurable:

- Groq API Key
- Suggestion prompt (the system prompt for generating 3 suggestions)
- Detail answer prompt (used when clicking a suggestion card)
- Chat prompt (used for manual typed questions)
- Summarize prompt (used for compressing older transcript)
- Suggestion context window (how many recent transcript lines to include for suggestions)
- Chat context window (how many recent transcript lines to include for chat answers)

All prompts have sensible defaults. The reset button restores them.

## Prompt Strategy

### Suggestion Prompt

The key decision was telling the model to prioritize based on what just happened rather than always producing a balanced mix. If a question was asked, lead with an answer. If a claim was made, lead with a fact-check. This makes suggestions feel timely and relevant rather than generic.

Each suggestion is 1-2 sentences and immediately actionable. The preview text alone should deliver value even without clicking through to the detailed answer. The prompt includes an example output to anchor the format.

### Detail vs Chat Prompts

These are separate because the use case is different:

- When you click a suggestion, you want a thorough expansion with data, sources, and actionable steps. You chose to dig into this specific topic.
- When you type a question in chat, you want a clear direct answer. It might be tangential to the current conversation.

Using the same prompt for both would either make suggestion answers too shallow or make chat answers unnecessarily verbose.

### Context Window Sizing

The suggestion context window is intentionally smaller (10 lines) than the chat context window (20 lines). Suggestions need to be fast and focused on the most recent exchange. Chat answers can afford to look further back because the user explicitly asked for more detail.

The summarization layer compresses everything before the context window into 2-3 sentences so the model still knows the broader conversation context without eating tokens on old transcript lines.

## Tradeoffs

**30-second segments vs continuous streaming** - Whisper works best with complete utterances. Continuous streaming would require a WebSocket-based STT service and would introduce complexity around partial transcripts and editing. 30-second segments are a simple, reliable choice. The downside is a 30-second delay before new text appears, which is acceptable for a meeting assistant where real-time captioning is not the goal.

**Summarization vs full context** - Sending the entire transcript to every suggestion/chat call would work for short meetings but would hit token limits and increase latency as the conversation grows. Summarizing older content is a pragmatic middle ground. The tradeoff is that very old specific details might be lost in the summary, but recent context is always preserved in full.

**Client-side API key via header** - The API key is stored in the browser and sent as a header on every request. A production app would use a backend session or OAuth, but keeping things simple with direct key entry makes sense for now. The key never appears in URLs or logs.

**Single session, no persistence** - No database, no auth, no server state. Everything lives in browser memory and Zustand. Settings persist to localStorage. This keeps the codebase focused on the core experience (suggestions and prompts) rather than infrastructure.

**Zod validation on every API route** - Adds a small amount of code but catches malformed requests early and provides clear error messages. Worth it for debuggability.

## Project Structure

```
app/
  page.tsx              -- Main 3-column layout
  setup/page.tsx        -- API key entry screen
  api/
    transcribe/route.ts -- Whisper transcription endpoint
    suggestions/route.ts -- Suggestion generation endpoint
    chat/route.ts       -- Streaming chat endpoint
    summarize/route.ts  -- Transcript summarization endpoint
    validate-key/route.ts -- API key validation
components/
  MicTranscript.tsx     -- Mic control and transcript display
  LiveSuggestions.tsx   -- Suggestion batches with auto-refresh
  ChatPanel.tsx         -- Chat input and streaming responses
  SuggestionCard.tsx    -- Individual suggestion card (color-coded by type)
  ChatMessage.tsx       -- Chat message bubble with markdown rendering
  SettingsModal.tsx     -- Settings dialog
  ExportButton.tsx      -- Session export to JSON
  TopBar.tsx            -- Top bar with status, export, settings
  TranscriptLine.tsx    -- Single transcript line with timestamp
  ScrollToBottom.tsx    -- Scroll-to-bottom button component
  ui/                   -- shadcn/ui primitives
lib/
  store.ts              -- Zustand state management
  prompts.ts            -- Default prompt templates
  config.ts             -- Models, timing constants, limits
  types.ts              -- TypeScript type definitions
  schemas.ts            -- Zod request validation schemas
  audio.ts              -- MediaRecorder helpers
  template.ts           -- Template interpolation for prompts
  transcribe-filter.ts  -- Whisper hallucination detection
  api-metrics.ts        -- API health tracking for status indicator
  api-error.ts          -- Error response helper
  markdown-components.tsx -- Custom markdown rendering components
  useScrollToBottom.ts  -- Auto-scroll hook
  utils.ts              -- cn() utility
```

## Deployment

Deployed at [conversant.vercel.app](https://conversant.vercel.app) via Vercel.

To deploy your own instance, push to GitHub and import in Vercel. Zero config needed. No environment variables are required since the user provides their own API key through the UI.
