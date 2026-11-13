import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import META from '../routeMeta.json'

type Meta = { title: string; description: string; canonical: string; robots: string }

function setMeta(selector: string, attr: string, key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

// Keeps title, description, canonical and robots in sync with the route
// (static per-route HTML is also prerendered at build time).
export default function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
    const m = (META as Record<string, Meta>)[key] ?? (META as Record<string, Meta>)['/']
    document.title = m.title
    setMeta('meta[name="description"]', 'name', 'description', m.description)
    setMeta('meta[name="robots"]', 'name', 'robots', m.robots)
    setMeta('meta[property="og:title"]', 'property', 'og:title', m.title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', m.description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', m.canonical)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = m.canonical
  }, [pathname])
  return null
}
