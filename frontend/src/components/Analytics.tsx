import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export default function Analytics() {
  const location = useLocation()
  const previousPath = useRef<string | null>(null)

  useEffect(() => {
    const path = location.pathname
    if (previousPath.current === null) {
      previousPath.current = path
      return
    }
    if (previousPath.current === path) {
      return
    }
    previousPath.current = path
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-V9GHYM1M2M', { page_path: path })
    }
  }, [location.pathname])

  return null
}
