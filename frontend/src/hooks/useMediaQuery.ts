import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(getMatches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handleChange = () => setMatches(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
