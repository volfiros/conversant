"use client"

import { ChevronDown } from "lucide-react"

interface ScrollToBottomButtonProps {
  show: boolean
  onClick: () => void
  className?: string
}

export function ScrollToBottomButton({ show, onClick, className = "" }: ScrollToBottomButtonProps) {
  if (!show) return null

  return (
    <button
      onClick={onClick}
      className={`absolute z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all duration-150 flex items-center justify-center shadow-lg ${className}`}
      aria-label="Scroll to bottom"
      title="Scroll to bottom"
    >
      <ChevronDown size={16} />
    </button>
  )
}
