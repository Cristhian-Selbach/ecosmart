"use client"

import { useEffect, useState } from "react"

/** Re-renderiza periodicamente (para "há 4 min"). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function useCountdown(seconds: number, key: unknown) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [seconds, key])
  return left
}

export const isTypingTarget = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  if (!t) return false
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.getAttribute("role") === "combobox"
}
