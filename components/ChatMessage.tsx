"use client"

import { useState, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { markdownComponents } from "@/lib/markdown-components"
import type { Components } from "react-markdown"
import { Copy, Check } from "lucide-react"
import "highlight.js/styles/github-dark.css"

const baseComponents = { ...markdownComponents }

function PreBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  const extractText = (node: React.ReactNode): string => {
    if (typeof node === "string") return node
    if (typeof node === "number") return String(node)
    if (!node || typeof node !== "object") return ""
    if (Array.isArray(node)) return node.map(extractText).join("")
    const props = (node as { props?: { children?: React.ReactNode } }).props
    if (props?.children) return extractText(props.children)
    return ""
  }

  const code = extractText(children)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-2">
      <pre className="bg-black/40 rounded-md p-3 overflow-x-auto text-xs font-mono !mt-0 !mb-0">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white/70 hover:text-white"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  label?: string
  isStreaming?: boolean
}

function useDebouncedContent(content: string, isStreaming: boolean): string {
  const [debounced, setDebounced] = useState(content)
  const rafRef = useRef<number | null>(null)
  const latestRef = useRef(content)

  latestRef.current = content

  if (!isStreaming) {
    return content
  }

  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      setDebounced(latestRef.current)
      rafRef.current = null
    })
  }

  return debounced
}

const components: Components = {
  ...markdownComponents,
  pre: ({ children }) => <PreBlock>{children}</PreBlock>,
}

export function ChatMessage({ role, content, label, isStreaming }: ChatMessageProps) {
  const debouncedContent = useDebouncedContent(content, !!isStreaming)

  return (
    <div className={`mb-3.5 ${role === "user" ? "animate-slide-in-left" : "animate-slide-in-right"}`}>
      <div className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-white/40 mb-1">
        {role === "user"
          ? label
            ? `You · ${label}`
            : "You"
          : "Assistant"}
      </div>
      <div
        className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-white text-black rounded-[12px_12px_4px_12px]"
            : "bg-white/5 border border-white/[0.08] rounded-[12px_12px_12px_4px] text-white/90"
        }`}
      >
        {role === "assistant" ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={components}
          >
            {isStreaming ? debouncedContent : content}
          </ReactMarkdown>
        ) : (
          <span className="font-[family-name:var(--font-outfit)]">{content}</span>
        )}
        {isStreaming && <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle animate-blink" />}
      </div>
    </div>
  )
}
