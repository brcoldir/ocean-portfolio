// Build-time prerender entry. scripts/prerender-meta.mjs calls render() for
// each public route so the HTML nginx serves already contains the page text,
// headings and links before any JavaScript runs. The browser bundle then
// mounts normally with createRoot (see main.tsx).
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App.tsx'

export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
}
