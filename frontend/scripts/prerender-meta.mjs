// Writes per-route HTML shells (dist/coldiron.html, dist/manageai.html) with
// the right title/description/canonical/robots baked in, plus a static
// dist/404.html. nginx serves these so crawlers see route-specific meta
// before any JavaScript runs.
import { readFileSync, writeFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const meta = JSON.parse(readFileSync(new URL('../src/routeMeta.json', import.meta.url)))
const base = readFileSync(new URL('index.html', dist), 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function render(m) {
  let h = base
  const sub = (re, val) => {
    if (!re.test(h)) throw new Error('pattern not found: ' + re)
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
  return h
}

for (const [route, m] of Object.entries(meta)) {
  if (route === '/') continue
  writeFileSync(new URL(route.slice(1) + '.html', dist), render(m))
  console.log('prerendered', route)
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
    <li><a href="/oceansoutdoors/">Ocean Outdoors photo stories</a></li>
    <li><a href="/oceansoutdoors/high-points/">State high points</a></li>
  </ul>
</body>
</html>
`)
console.log('wrote 404.html')
