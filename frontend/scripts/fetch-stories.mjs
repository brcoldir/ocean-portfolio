// Pulls the newest Ocean Outdoors stories from the live blog RSS feed into
// src/data/latestStories.json so /coldiron can link to fresh content.
// If the feed can't be reached, the committed JSON is kept as-is.
import { writeFileSync } from 'node:fs'

const FEED = 'https://oceancoldiron.com/oceansoutdoors/feed.xml'
const out = new URL('../src/data/latestStories.json', import.meta.url)
const decode = (s) => s
  .replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

try {
  const res = await fetch(FEED, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const xml = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6).map(([, it]) => ({
    title: decode((it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim(),
    link: ((it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim(),
  })).filter((s) => s.title && s.link.startsWith('https://oceancoldiron.com/oceansoutdoors/'))
  if (items.length === 0) throw new Error('no items')
  writeFileSync(out, JSON.stringify(items, null, 2) + '\n')
  console.log('latest stories:', items.length)
} catch (e) {
  console.warn('fetch-stories: keeping committed latestStories.json (' + e.message + ')')
}
