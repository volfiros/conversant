import { useCallback, useEffect, useRef, useState } from "react"

export function useScrollToBottom<T extends HTMLElement>(deps: React.DependencyList) {
  const scrollRef = useRef<T | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isNearBottomRef = useRef(true)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollHeight, scrollTop, clientHeight } = el
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80
    isNearBottomRef.current = nearBottom
    setShowScrollButton(!nearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isNearBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, deps)

  return { scrollRef, showScrollButton, handleScroll, scrollToBottom }
}
