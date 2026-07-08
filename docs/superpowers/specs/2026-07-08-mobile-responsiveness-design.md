# Mobile Responsiveness Design

**Date:** 2026-07-08  
**Status:** Approved  
**Scope:** Home page (`App.tsx`) and shared components — `ChatWidget.tsx`, `App.css`

---

## Problem Summary

The portfolio looks great on desktop but is broken on mobile. The root causes, ranked by severity:

1. **Embedded chat sidebar** (`w-1/4 flex-shrink-0`) is always visible, squashing main content to ~280px on a 375px phone.
2. **Navbar** is anchored `right-[25%]` at all screen sizes, leaving a dead zone on mobile.
3. **Contact form** name/email row is always `grid-cols-2` — too narrow on small screens.
4. **Human-mode visual cards** use absolute positioning inside a fixed-height container; they overflow and overlap on narrow screens.
5. **Floating chat FAB panel** is a fixed `w-80` (320px) — overflows on 320px devices.
6. **`App.css` boilerplate** (`max-width: 1280px`, `padding: 2rem`, `text-align: center` on `#root`) conflicts with the Tailwind layout.

---

## Approach

**Option B — Extract `MobileNav` + `PageLayout` components.**

Rather than scattering `md:` breakpoint patches throughout `App.tsx`, we extract layout concerns into dedicated components. This keeps `App.tsx` focused on section content and makes the responsive layout logic easy to find and maintain.

---

## Architecture

### New Files

**`frontend/src/components/PageLayout.tsx`**  
Top-level layout wrapper. Uses a `useMediaQuery` hook (listening to `window.matchMedia('(min-width: 768px)')`) to determine the current breakpoint. Renders:

- **Mobile (`< 768px`):** `<MobileNav>` full-width fixed at top → main content full-width below → `<ChatWidget variant="floating">` FAB in bottom-right corner. No sidebar.
- **Desktop (`≥ 768px`):** Fixed nav with `right-[25%]` offset → `flex` row with main content (`flex-1`) and `<ChatWidget variant="embedded">` sidebar (`w-1/4`) pinned right. Existing desktop layout preserved exactly.

**`frontend/src/hooks/useMediaQuery.ts`**  
Thin React hook wrapping `window.matchMedia`. Returns a boolean, re-evaluates on resize via the `change` event listener. SSR-safe (defaults to `true` / desktop on server).

```ts
function useMediaQuery(query: string): boolean
```

**`frontend/src/components/MobileNav.tsx`**  
Mobile-only navigation bar (rendered by `PageLayout` on small screens).

State: `isOpen: boolean`

Structure:
- Fixed full-width bar (top-0, left-0, right-0, z-50): logo on the left, hamburger/close icon button on the right.
- When `isOpen === true`: full-width overlay drawer slides down below the bar, containing anchor links to every major section. Clicking any link closes the drawer and the browser scrolls to the target.

Anchor links (in order): About · Skills · Experience · Education · Projects · Contact

### Modified Files

**`frontend/src/App.tsx`**
- Remove inline navbar JSX and sidebar `div`.
- Wrap all section content in `<PageLayout>`.
- Inline secondary fixes:
  - Contact form: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
  - Human-mode visual cards: replace `relative h-80` + absolutely positioned cards with `flex flex-wrap gap-4 justify-center`; cards become flow elements.

**`frontend/src/components/ChatWidget.tsx`**
- Floating panel `div`: add `max-w-[calc(100vw-3rem)]` alongside existing `w-80` so the panel never overflows on sub-320px devices.

**`frontend/src/App.css`**
- Remove the Vite boilerplate rules: `#root { max-width: 1280px; padding: 2rem; text-align: center; }` and the logo spin animation (unused).

---

## Data Flow

No new data or state is introduced beyond `isOpen` (local to `MobileNav`) and the `useMediaQuery` boolean (local to `PageLayout`). All chat state remains in `ChatWidget`.

---

## Breakpoints

| Breakpoint | Width    | Layout                                      |
|------------|----------|---------------------------------------------|
| Mobile     | < 768px  | Full-width content, MobileNav, floating FAB |
| Desktop    | ≥ 768px  | Sidebar layout, inline nav, embedded chat   |

Tailwind's `md` prefix maps to `768px` — we stay consistent with that convention.

---

## Error Handling

- `useMediaQuery` defaults to `true` (desktop layout) if `window.matchMedia` is unavailable (SSR, old browsers). This means the desktop layout is the fallback — acceptable for a portfolio.
- No async operations are introduced.

---

## Testing

Manual verification checklist:
- [ ] Chrome DevTools → iPhone SE (375px): sidebar hidden, MobileNav visible, FAB present
- [ ] Chrome DevTools → Pixel 7 (412px): hamburger opens/closes drawer, all anchor links scroll correctly
- [ ] Chrome DevTools → iPad (768px): desktop layout kicks in, sidebar visible, no hamburger
- [ ] Desktop (1280px+): existing layout unchanged
- [ ] Floating FAB panel on 320px: panel does not overflow viewport
- [ ] Contact form on 375px: inputs stack vertically
- [ ] Human-mode section on 375px: cards wrap without overflow

---

## Out of Scope

- `/coldiron` and `/manageai` pages — the audit found them mostly responsive already.
- Dark/light mode.
- Animation polish on the mobile nav drawer (functional open/close is sufficient).
- `lg:` and `xl:` breakpoint improvements beyond what already exists.
