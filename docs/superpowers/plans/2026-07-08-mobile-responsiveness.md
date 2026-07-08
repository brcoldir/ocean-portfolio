# Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portfolio home page fully usable on mobile devices by extracting responsive layout concerns into dedicated components.

**Architecture:** A new `PageLayout` component uses a `useMediaQuery` hook to render either the desktop layout (inline nav + embedded chat sidebar) or a mobile layout (full-width `MobileNav` with hamburger drawer + floating chat FAB). Secondary inline fixes address the contact form, human-mode visual cards, floating FAB overflow, and Vite boilerplate CSS.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite 7, lucide-react

## Global Constraints

- Tailwind `md` breakpoint = 768px — use `(min-width: 768px)` in `window.matchMedia` and `md:` prefix in Tailwind classes consistently.
- Desktop layout must remain pixel-identical to the current experience.
- All new files live under `frontend/src/`.
- No new npm dependencies.

---

### Task 1: Strip App.css boilerplate

**Files:**
- Modify: `frontend/src/App.css`

**Interfaces:**
- Produces: nothing (file is emptied of all rules that conflict with Tailwind)

- [ ] **Step 1: Replace App.css contents**

The current content (`#root { max-width: 1280px; padding: 2rem; text-align: center; }` and logo spin animation) is unused Vite boilerplate that conflicts with the Tailwind layout. Replace the entire file with a single newline (empty file).

Final file content: *(empty)*

- [ ] **Step 2: Verify the page renders correctly**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Expected: layout visually unchanged (the removed rules were not doing anything useful, but verify no unintended shift).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.css
git commit -m "chore: remove Vite boilerplate from App.css"
```

---

### Task 2: Add section IDs, fix contact form, and fix human-mode cards in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: Six section `id` attributes (`about`, `skills`, `experience`, `education`, `projects`, `contact`) that `MobileNav` in Task 5 will link to.

- [ ] **Step 1: Add section IDs**

Add an `id` attribute to each major section. The `MobileNav` anchor links depend on these exact IDs.

Edit 1 — About/Skills dual-content section (line ~328):
```tsx
// Before:
<section className={`py-24 px-6 transition-colors duration-500 ${mode === 'dev' ? 'bg-slate-900/50 border-y border-slate-800' : 'bg-stone-100 border-y border-stone-200'}`}>

// After:
<section id="about" className={`py-24 px-6 transition-colors duration-500 ${mode === 'dev' ? 'bg-slate-900/50 border-y border-slate-800' : 'bg-stone-100 border-y border-stone-200'}`}>
```

Edit 2 — Skills grid div (line ~340, inside the About section):
```tsx
// Before:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// After:
<div id="skills" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

Edit 3 — Experience section (line ~426):
```tsx
// Before:
<section className="py-24 px-6">

// After:
<section id="experience" className="py-24 px-6">
```

Edit 4 — Education section (line ~460):
```tsx
// Before:
<section className={`py-24 px-6 ${mode === 'dev' ? 'bg-slate-900/30 border-y border-slate-800' : 'bg-stone-50 border-y border-stone-200'}`}>

// After:
<section id="education" className={`py-24 px-6 ${mode === 'dev' ? 'bg-slate-900/30 border-y border-slate-800' : 'bg-stone-50 border-y border-stone-200'}`}>
```

Edit 5 — Projects section (line ~488):
```tsx
// Before:
<section className={`py-24 px-6 ${mode === 'dev' ? 'bg-[#0a0f1e]' : 'bg-[#f4f1ea]'}`}>

// After:
<section id="projects" className={`py-24 px-6 ${mode === 'dev' ? 'bg-[#0a0f1e]' : 'bg-[#f4f1ea]'}`}>
```

Edit 6 — Contact section (line ~544):
```tsx
// Before:
<section className={`py-24 px-6 ${mode === 'dev' ? 'bg-gradient-to-b from-[#0a0f1e] to-slate-950' : 'bg-stone-100'}`}>

// After:
<section id="contact" className={`py-24 px-6 ${mode === 'dev' ? 'bg-gradient-to-b from-[#0a0f1e] to-slate-950' : 'bg-stone-100'}`}>
```

- [ ] **Step 2: Fix contact form column layout**

On mobile (< 640px), name and email inputs must stack vertically. Find line ~555:

```tsx
// Before:
<div className="grid grid-cols-2 gap-4">

// After:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

- [ ] **Step 3: Fix human-mode visual cards**

The two info cards are absolutely positioned inside a fixed-height container. On narrow screens they overflow and overlap. Replace with a flex-wrap layout (line ~393):

```tsx
// Before:
<div className="relative h-80 w-full">
  <div className="absolute top-0 right-10 bg-white p-5 rounded-lg shadow-md border border-stone-200 rotate-3 z-10 max-w-xs transition-transform hover:scale-105 hover:z-20">
    <div className="flex gap-3 mb-3">
      <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Youtube size={24} /></div>
      <div>
        <div className="font-bold text-stone-800">Content Creator</div>
        <div className="text-xs text-stone-500">100k+ Subscribers</div>
      </div>
    </div>
    <p className="text-sm text-stone-600 leading-snug">
      "Documenting the RV life and outdoor adventures for a growing community of enthusiasts."
    </p>
  </div>

  <div className="absolute bottom-4 left-4 bg-white p-5 rounded-lg shadow-md border border-stone-200 -rotate-2 max-w-xs transition-transform hover:scale-105 hover:z-20">
    <div className="flex gap-3 mb-3">
      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Mountain size={24} /></div>
      <div>
        <div className="font-bold text-stone-800">Mountaineer</div>
        <div className="text-xs text-stone-500">Goal: Denali 2028</div>
      </div>
    </div>
    <p className="text-sm text-stone-600 leading-snug">
      "Attempting to summit the high point of every US state. Living full-time on the road to make it happen."
    </p>
  </div>
</div>

// After:
<div className="flex flex-wrap gap-6 justify-center">
  <div className="bg-white p-5 rounded-lg shadow-md border border-stone-200 rotate-3 max-w-xs transition-transform hover:scale-105">
    <div className="flex gap-3 mb-3">
      <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Youtube size={24} /></div>
      <div>
        <div className="font-bold text-stone-800">Content Creator</div>
        <div className="text-xs text-stone-500">100k+ Subscribers</div>
      </div>
    </div>
    <p className="text-sm text-stone-600 leading-snug">
      "Documenting the RV life and outdoor adventures for a growing community of enthusiasts."
    </p>
  </div>

  <div className="bg-white p-5 rounded-lg shadow-md border border-stone-200 -rotate-2 max-w-xs transition-transform hover:scale-105">
    <div className="flex gap-3 mb-3">
      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Mountain size={24} /></div>
      <div>
        <div className="font-bold text-stone-800">Mountaineer</div>
        <div className="text-xs text-stone-500">Goal: Denali 2028</div>
      </div>
    </div>
    <p className="text-sm text-stone-600 leading-snug">
      "Attempting to summit the high point of every US state. Living full-time on the road to make it happen."
    </p>
  </div>
</div>
```

The only structural changes: outer div loses `relative h-80 w-full`; inner divs lose `absolute top-0 right-10` / `absolute bottom-4 left-4` and `z-10`/`z-20`.

- [ ] **Step 4: Verify in browser**

At `http://localhost:5173` with Chrome DevTools at 375px:
- Human mode → About section: both cards appear stacked or side-by-side without any overflow
- Contact section: Name and Email inputs stack vertically

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "fix: add section anchor IDs, fix contact form stacking, fix human-mode card layout"
```

---

### Task 3: Fix ChatWidget floating FAB panel overflow

**Files:**
- Modify: `frontend/src/components/ChatWidget.tsx:297`

**Interfaces:**
- Produces: Floating panel `div` capped at `calc(100vw - 3rem)` so it never overflows on sub-320px viewports

- [ ] **Step 1: Add max-width cap to floating panel**

```tsx
// Before (line 297):
<div className="w-80 flex flex-col overflow-hidden" style={{ height: '480px' }}>

// After:
<div className="w-80 max-w-[calc(100vw-3rem)] flex flex-col overflow-hidden" style={{ height: '480px' }}>
```

- [ ] **Step 2: Verify**

In Chrome DevTools at 320px, open the floating FAB. Panel must fit within the viewport without horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatWidget.tsx
git commit -m "fix: cap floating chat panel width to prevent overflow on narrow screens"
```

---

### Task 4: Create useMediaQuery hook

**Files:**
- Create: `frontend/src/hooks/useMediaQuery.ts`

**Interfaces:**
- Produces: `export function useMediaQuery(query: string): boolean` — returns `true` when the media query matches; defaults to `true` (desktop) when `window` is unavailable

- [ ] **Step 1: Create the hooks directory and file**

```bash
mkdir -p frontend/src/hooks
```

Create `frontend/src/hooks/useMediaQuery.ts`:

```ts
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
```

`typeof window === 'undefined'` defaults to `true` (desktop layout) in SSR environments.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery hook for responsive layout switching"
```

---

### Task 5: Create MobileNav component

**Files:**
- Create: `frontend/src/components/MobileNav.tsx`

**Interfaces:**
- Produces:
  ```tsx
  interface MobileNavProps {
    mode: 'dev' | 'human'
    onToggleMode: () => void
    name: string
  }
  export default MobileNav
  ```

- [ ] **Step 1: Write MobileNav.tsx**

Create `frontend/src/components/MobileNav.tsx`:

```tsx
import { useState } from 'react'
import { Terminal, Tent, Cpu, Coffee, Menu, X } from 'lucide-react'

interface MobileNavProps {
  mode: 'dev' | 'human'
  onToggleMode: () => void
  name: string
}

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Education', href: '#education' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

const MobileNav = ({ mode, onToggleMode, name }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const isDev = mode === 'dev'

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${isDev ? 'bg-[#0a0f1e]/95 backdrop-blur border-slate-800' : 'bg-white/95 backdrop-blur border-stone-200 shadow-sm'}`}>
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg flex items-center gap-2">
            {isDev ? <Terminal size={18} className="text-blue-500" /> : <Tent size={18} className="text-orange-600" />}
            <span className="tracking-tight">{name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isDev
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'bg-white text-orange-600 border border-stone-200 shadow-sm'
              }`}
            >
              {isDev ? <><span>System</span><Cpu size={12} /></> : <><span>Human</span><Coffee size={12} /></>}
            </button>
            <button
              onClick={() => setIsOpen(o => !o)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              className={`p-2 rounded-lg transition-colors ${isDev ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {isOpen && (
        <>
          <div className={`fixed top-14 left-0 right-0 z-40 border-b ${isDev ? 'bg-[#0a0f1e] border-slate-800' : 'bg-white border-stone-200 shadow-lg'}`}>
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${isDev
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setIsOpen(false)} />
        </>
      )}
    </>
  )
}

export default MobileNav
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MobileNav.tsx
git commit -m "feat: add MobileNav component with hamburger drawer"
```

---

### Task 6: Create PageLayout component

**Files:**
- Create: `frontend/src/components/PageLayout.tsx`

**Interfaces:**
- Consumes:
  - `useMediaQuery('(min-width: 768px)'): boolean` from `../hooks/useMediaQuery`
  - `<ChatWidget mode={mode} variant="embedded" />` and `<ChatWidget mode={mode} variant="floating" />` — `variant` prop is already typed in `ChatWidget.tsx` as `'floating' | 'embedded'`
  - `<MobileNav mode={mode} onToggleMode={onToggleMode} name={name} />` from `./MobileNav`
- Produces:
  ```tsx
  interface PageLayoutProps {
    children: React.ReactNode
    mode: 'dev' | 'human'
    scrolled: boolean
    onToggleMode: () => void
    name: string
  }
  export default PageLayout
  ```

- [ ] **Step 1: Write PageLayout.tsx**

Create `frontend/src/components/PageLayout.tsx`:

```tsx
import { Terminal, Tent, Cpu, Coffee } from 'lucide-react'
import { ChatWidget } from './ChatWidget'
import MobileNav from './MobileNav'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface PageLayoutProps {
  children: React.ReactNode
  mode: 'dev' | 'human'
  scrolled: boolean
  onToggleMode: () => void
  name: string
}

const PageLayout = ({ children, mode, scrolled, onToggleMode, name }: PageLayoutProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isDev = mode === 'dev'

  const outerClass = `transition-colors duration-700 font-sans selection:bg-opacity-30 ${
    isDev ? 'bg-[#0a0f1e] text-slate-100 selection:bg-blue-500' : 'bg-[#f8f5f2] text-stone-800 selection:bg-orange-500'
  }`

  if (isDesktop) {
    return (
      <div className={`flex min-h-screen ${outerClass}`}>
        <div className="flex-1 min-w-0">
          <nav className={`fixed top-0 left-0 right-[25%] z-50 transition-all duration-300 ${
            scrolled
              ? isDev
                ? 'bg-[#0a0f1e]/90 backdrop-blur border-b border-slate-800'
                : 'bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm'
              : 'bg-transparent'
          }`}>
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="font-bold text-xl flex items-center gap-2">
                {isDev ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
                <span className="tracking-tight">{name}</span>
              </div>
              <button
                onClick={onToggleMode}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isDev
                    ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'bg-white hover:bg-stone-50 text-orange-600 border border-stone-200 shadow-sm'
                }`}
              >
                {isDev ? <><span>System View</span><Cpu size={16} /></> : <><span>Human View</span><Coffee size={16} /></>}
              </button>
            </div>
          </nav>
          {children}
        </div>
        <div className={`w-1/4 flex-shrink-0 sticky top-0 h-screen border-l ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
          <ChatWidget mode={mode} variant="embedded" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${outerClass}`}>
      <MobileNav mode={mode} onToggleMode={onToggleMode} name={name} />
      {children}
      <ChatWidget mode={mode} variant="floating" />
    </div>
  )
}

export default PageLayout
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PageLayout.tsx
git commit -m "feat: add PageLayout component with responsive desktop/mobile switching"
```

---

### Task 7: Refactor App.tsx to use PageLayout

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `PageLayout` — props `mode: 'dev' | 'human'`, `scrolled: boolean`, `onToggleMode: () => void`, `name: string`

- [ ] **Step 1: Add PageLayout import**

Add this line after the existing component imports at the top of `App.tsx`:

```tsx
import PageLayout from './components/PageLayout'
```

- [ ] **Step 2: Replace the outer layout divs and remove the inline nav**

The `home` variable starts at line 197. Replace everything from the opening `<div className="flex min-h-screen...">` through the closing `</nav>` block (the entire inline nav) with the `<PageLayout>` opening tag.

```tsx
// Remove this entire block (lines 198–222):
<div className={`flex min-h-screen transition-colors duration-700 font-sans selection:bg-opacity-30 ${mode === 'dev' ? 'bg-[#0a0f1e] text-slate-100 selection:bg-blue-500' : 'bg-[#f8f5f2] text-stone-800 selection:bg-orange-500'}`}><div className="flex-1 min-w-0">

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-[25%] z-50 transition-all duration-300 ${scrolled ? (mode === 'dev' ? 'bg-[#0a0f1e]/90 backdrop-blur border-b border-slate-800' : 'bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm') : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            {mode === 'dev' ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
            <span className="tracking-tight">{SITE_DATA.name}</span>
          </div>

          <button
            onClick={toggleMode}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${mode === 'dev'
              ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'bg-white hover:bg-stone-50 text-orange-600 border border-stone-200 shadow-sm'
              }`}
          >
            {mode === 'dev' ? (
              <><span>System View</span><Cpu size={16} /></>
            ) : (
              <><span>Human View</span><Coffee size={16} /></>
            )}
          </button>
        </div>
      </nav>

// Replace with:
<PageLayout mode={mode} scrolled={scrolled} onToggleMode={toggleMode} name={SITE_DATA.name}>
```

- [ ] **Step 3: Fix hero section padding for mobile**

The hero `pt-40` (160px) was designed to clear the 64px desktop nav. On mobile, `MobileNav` is `h-14` (56px), so reduce top padding on mobile:

```tsx
// Before:
<section className="pt-40 pb-20 px-6 relative overflow-hidden">

// After:
<section className="pt-20 pb-16 md:pt-40 md:pb-20 px-6 relative overflow-hidden">
```

- [ ] **Step 4: Remove closing wrapper divs and sidebar; close with PageLayout**

Find the end of the `home` variable. Replace:

```tsx
    </div>

      {/* Embedded chat sidebar */}
      <div className={`w-1/4 flex-shrink-0 sticky top-0 h-screen border-l ${mode === 'dev' ? 'border-slate-800' : 'border-stone-200'}`}>
        <ChatWidget mode={mode} variant="embedded" />
      </div>
    </div>
  );
```

With:

```tsx
    </PageLayout>
  );
```

- [ ] **Step 5: Remove the now-unused `Cpu` import from App.tsx**

`Cpu` was only used in the inline nav toggle button, which is now handled by `PageLayout`. Check that `Cpu` does not appear anywhere else in `App.tsx`, then remove it from the lucide-react import line.

`Terminal` and `Coffee` are still used in the About section and hero subtitle respectively — keep them.

- [ ] **Step 6: Verify TypeScript compiles clean**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 7: Run dev server and verify manually**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` and verify each case:

| Viewport (Chrome DevTools) | Expected behavior |
|---|---|
| 1280px desktop | Sidebar visible, nav ends at 25% from right, no hamburger |
| 768px (iPad) | Desktop layout — sidebar visible, no hamburger |
| 767px | Mobile layout: `MobileNav` visible, no sidebar, FAB in bottom-right |
| 375px (iPhone SE) | Hamburger opens/closes drawer; all 6 anchor links scroll to correct sections |
| 320px | Floating FAB panel opens within viewport, no horizontal scroll |
| 375px contact form | Name + Email inputs stack vertically |
| Human mode 375px | About section cards wrap neatly, no overflow |
| Toggle mode on mobile | MobileNav updates to match dev/human colors correctly |

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: refactor App.tsx to use PageLayout for responsive layout switching"
```

---

## Self-Review

**Spec coverage:**
- Embedded chat sidebar hidden on mobile → Task 6 (`PageLayout` renders `ChatWidget variant="floating"` on mobile)
- Navbar full-width on mobile with hamburger → Tasks 5+6 (`MobileNav` + `PageLayout`)
- Contact form stacks on mobile → Task 2
- Human-mode visual cards adapt to narrow screens → Task 2
- Floating FAB panel overflow fix → Task 3
- App.css boilerplate removed → Task 1
- Section IDs for anchor links → Task 2
- Hero padding adjusted for mobile nav height → Task 7

**Placeholder scan:** No TBDs, no "see Task N" shortcuts. All code steps show the complete code to write or the complete old/new strings for edits.

**Type consistency:**
- `MobileNavProps` defined in Task 5 (`mode`, `onToggleMode`, `name`) — consumed by `PageLayout` in Task 6 with identical prop names.
- `PageLayoutProps` defined in Task 6 (`mode`, `scrolled`, `onToggleMode`, `name`) — consumed in `App.tsx` Task 7 as `<PageLayout mode={mode} scrolled={scrolled} onToggleMode={toggleMode} name={SITE_DATA.name}>`.
- `useMediaQuery(query: string): boolean` defined in Task 4, called in Task 6 as `useMediaQuery('(min-width: 768px)')`.
- `ChatWidget` called with `variant="embedded"` and `variant="floating"` — both are valid values of the existing `variant?: 'floating' | 'embedded'` prop in `ChatWidget.tsx`.
