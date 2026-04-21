import { useCallback, useEffect, useRef, useState } from "react"

export function useScrollToBottom<T extends HTMLElement>(deps: React.DependencyList) {
  const scrollRef = useRef<T | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollHeight, scrollTop, clientHeight } = el
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, deps)

  return { scrollRef, showScrollButton, handleScroll, scrollToBottom }
}
