// Post-build prerender. For each public route this writes static HTML that
// crawlers (and anyone without JavaScript) can read:
//   - route-specific <title>, description, canonical, robots, OG/Twitter tags
//   - JSON-LD (WebSite + ProfilePage + Person) from scripts/schema.mjs
//   - the page body rendered with React on the server (dist-ssr/entry-server.js)
// Output: dist/index.html (/), dist/coldiron.html, dist/manageai.html, dist/404.html.
// nginx maps those routes to these files (deploy/nginx/oceancoldiron.com.conf).
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { graphFor } from './schema.mjs'

const dist = new URL('../dist/', import.meta.url)
const ssrEntry = new URL('../dist-ssr/entry-server.js', import.meta.url)
const meta = JSON.parse(readFileSync(new URL('../src/routeMeta.json', import.meta.url)))
const base = readFileSync(new URL('index.html', dist), 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const today = new Date().toISOString().slice(0, 10)
const { render } = await import(ssrEntry.href)

// Pages whose body is prerendered. /manageai is a private admin screen, so it
// only gets its meta (noindex) and keeps an empty shell.
const PRERENDER_BODY = new Set(['/', '/coldiron'])

function page(route, m) {
  let h = base
  const sub = (re, val) => {
    if (!re.test(h)) throw new Error(route + ': pattern not found: ' + re)
    h = h.replace(re, val)
  }
  sub(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
  sub(/(<meta name="description"\s+content=")[^"]*(")/, `$1${esc(m.description)}$2`)
  sub(/(<meta name="robots" content=")[^"]*(")/, `$1${esc(m.robots)}$2`)
  sub(/(<link rel="canonical" href=")[^"]*(")/, `$1${m.canonical}$2`)
  sub(/(<meta property="og:url" content=")[^"]*(")/, `$1${m.canonical}$2`)
  sub(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(m.title)}$2`)
  sub(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(m.description)}$2`)
  sub(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(m.title)}$2`)
  sub(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(m.description)}$2`)

  const ld = m.robots.startsWith('noindex') ? '' :
    `<script type="application/ld+json">\n${JSON.stringify(graphFor(route, today), null, 2).replace(/</g, '\\u003c')}\n  </script>`
  sub(/<!--JSONLD-->/, ld)

  if (PRERENDER_BODY.has(route)) {
    const body = render(route)
    if (body.length < 2000) throw new Error(route + ': prerendered body looks empty')
    sub(/<div id="root"><\/div>/, `<div id="root">${body}</div>`)
  }
  if (/\u2014/.test(h)) throw new Error(route + ': em dash found in output')
  return h
}

for (const [route, m] of Object.entries(meta)) {
  const file = route === '/' ? 'index.html' : route.slice(1) + '.html'
  writeFileSync(new URL(file, dist), page(route, m))
  console.log('prerendered', route, '->', file)
}

writeFileSync(new URL('404.html', dist), `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found | Ocean Coldiron</title>
  <meta name="robots" content="noindex, follow">
  <link rel="icon" type="image/x-icon" href="/ocean.ico">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-V9GHYM1M2M"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-V9GHYM1M2M');</script>
  <style>body{font-family:system-ui,sans-serif;max-width:640px;margin:15vh auto;padding:0 24px;color:#1c1917;line-height:1.6}a{color:#ea580c}</style>
</head>
<body>
  <h1>That page is not here</h1>
  <p>The link may be old or mistyped.</p>
  <ul>
    <li><a href="/">Ocean Coldiron, home and resume</a></li>
    <li><a href="/coldiron">About the Coldiron name</a></li>
    <li><a href="/oceansoutdoors/">Ocean Outdoors photo stories</a></li>
    <li><a href="/oceansoutdoors/high-points/">State high points</a></li>
  </ul>
</body>
</html>
`)
console.log('wrote 404.html')
rmSync(new URL('../dist-ssr/', import.meta.url), { recursive: true, force: true })
