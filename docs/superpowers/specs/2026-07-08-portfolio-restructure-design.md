# Portfolio Restructure Design — 2026-07-08

## Goal

Restructure `oceancoldiron.com` to optimize for personal brand builder / AI enthusiast positioning. The site should communicate "I build things, I'm into AI, come find me" — not "I'm looking for a new role." Add missing sections, reorder for UX impact, and update the CTA.

## New Page Order

1. Hero *(existing, minor copy tweak)*
2. What Makes Me Different *(new)*
3. About + Skills *(existing, repositioned from #2 to #3)*
4. Experience Timeline *(existing + new AI pivot entry at top in dev mode)*
5. AI Stack *(new)*
6. Projects *(existing)*
7. Education *(existing)*
8. Let's Talk *(renamed + rewritten CTA, email + phone added)*
9. Footer *(existing)*

---

## Section Designs

### 1. Hero *(existing — one copy change)*

No structural changes. Update the dev mode typewriter text from `replace("Chaos", "Clarity")` to `ship("in", "public")` to signal personal brand / builder energy rather than consulting energy.

All other elements unchanged: headshot, name, stats bar, social links.

---

### 2. What Makes Me Different *(new section)*

**Position:** Immediately after Hero — the first thing a visitor reads after the intro.

**Purpose:** Stop the scroll and answer "why should I care about this person?" Differentiates Ocean from a generic resume.

**Layout:** 4-card grid, 2×2 on all breakpoints. Cards are equal height, icon top-left, title, then body text.

**Dev mode heading:** `// Why Ocean?`
**Human mode heading:** `What makes me, me.`

#### Dev mode cards:

| Card | Title | Body |
|------|-------|------|
| 1 | Healthcare Integration Depth | HL7, Mirth Connect, 200+ enterprise clients. 95% reduction in critical incident recurrence. 75% improvement in MTTR. The messy real-world systems AI has to actually plug into. |
| 2 | AI Engineering Momentum | Building now with RAG, MCP, Databricks, Lakebase, Claude Code, and agentic workflows. Not studying AI — shipping it. |
| 3 | Entrepreneur + Product Builder | Founded businesses. Built EZPostScheduler from idea to production SaaS — Go, React, Postgres, AWS, Stripe, OAuth. Full-stack ownership, not just tickets. |
| 4 | Systems Thinking + Business Depth | 15+ years across enterprise, healthcare, and cloud. MBA (3.9 GPA), PMP certified. Bridges engineering, customers, and business outcomes. |

#### Human mode cards:

| Card | Title | Body |
|------|-------|------|
| 1 | Outdoor Creator | 100k+ YouTube subscribers. Adventure storytelling through Brandon Coldiron Outdoors and Ocean Outdoors. Building an audience around real, hard things. |
| 2 | 46/50 State High Points | One deliberate goal, pursued over years. Denali 2028. Discipline isn't a trait — it's a practice. |
| 3 | Builder Who Ships | EZPostScheduler, Summit Ridge Digital, OceanColdiron.com. Ideas become real things. Imperfect first, improved always. |
| 4 | Building with AI | Not just using AI — building with it. RAG, MCP, Claude Code. Sharing what I learn in public. |

**Styling:** Each card is a rounded border card with a leading icon and subtle hover lift. Dev mode uses blue accent icons on dark background. Human mode uses orange accent icons on warm white.

---

### 3. About + Skills *(existing — repositioned only)*

No content changes. Moves from position 2 to position 3. Now reads as depth *after* the differentiator hook rather than context *before* it. Left side: mode-specific about paragraph. Right side: skill bars grid.

---

### 4. Experience Timeline *(existing + one new entry)*

**Dev mode only change:** Add a new entry at the top of `SITE_DATA.experience.dev`:

```
year: "2025 – Present"
role: "AI Engineering | Building in Public"
company: "Personal Projects + ModMed AI Initiative"
desc: "Actively building with RAG, MCP, Databricks, Lakebase, Claude Code, and agentic workflows. Contributing to ModMed's AI acceleration initiative. Shipping personal AI projects in public — portfolio chatbot, MCP servers, healthcare automation concepts."
```

This entry sits above the ModMed Integration Consultant entry, framing the AI pivot as a distinct deliberate phase in the career arc.

No changes to human mode experience entries.

---

### 5. AI Stack *(new section — dev mode primary, human mode variant)*

**Position:** Between Experience and Projects.

**Purpose:** Explicitly surface the full AI + technical stack for visitors targeting AI roles. Currently buried as a single skill bar entry ("Agentic AI / MCP / RAG"). This section makes it scannable and specific.

**Dev mode layout:** Grouped pill/badge tags in labeled rows.

| Group | Tags |
|-------|------|
| LLM & Agents | Claude · Claude Code · RAG · MCP · FastMCP · Agentic Workflows · Prompt Engineering |
| Data & Platform | Databricks · Lakebase · FastAPI · PostgreSQL · AWS |
| Languages & Frameworks | Go · React · TypeScript · Python · Java / Spring Boot |
| Healthcare Interop | HL7 · FHIR · Mirth Connect · EHR / Practice Mgmt · OAuth2 |

**Dev mode heading:** `Tech Stack` with a subtitle: `"What I actually build with."`

**Human mode layout:** Same pill layout, different groups:

| Group | Tags |
|-------|------|
| Out There | Garmin inReach · Starlink · Grand Design RV · Hiking Boots |
| Creating | Final Cut Pro · DJI · iPhone · YouTube |
| Building | Claude Code · Go · React · AWS |
| Moving | Running Shoes · Trekking Poles · Crampons |

**Human mode heading:** `Gear & Tools` with subtitle: `"What I carry."`

**Styling:** Tag pills with subtle border, colored accent on hover. Section background alternates from Projects section. No progress bars — just clean pill groups. Each group has a small label above it.

---

### 6. Projects *(existing — one addition)*

No structural changes. Add `SummitRidgeDigital.com` as a link to The Mobile HQ card or as a new human mode card. EZPostScheduler already links out correctly.

**Addition:** Add Summit Ridge Digital as a 4th human project card in `SITE_DATA.projects.human`. Mobile HQ link stays as `"#"` (no public URL). New card:

```
title: "Summit Ridge Digital"
desc: "Web design, hosting, and digital services for small businesses. Because not every business needs a dev team — just a reliable partner."
tags: ["Web Design", "Hosting", "AWS", "Small Business"]
link: "https://summitridgedigital.com"
```

---

### 7. Education *(existing — no changes)*

No changes.

---

### 8. Let's Talk *(renamed + rewritten)*

**Heading change:** "Let's Connect" → **"Let's Talk"**

**Dev mode subtext:**
> "I'm building in public with AI and always interested in talking shop — healthcare tech, agentic systems, or whatever hard problem you're working on. Not hunting for a role, just growing in the open."

**Human mode subtext:**
> "Adventures, ideas, collabs — hit me up. I like real conversations with people doing interesting things."

**Contact info displayed above the form (both modes):**
- Email: `brcoldir@gmail.com` (clickable mailto link)
- Cell: `(574) 806-5895` (clickable tel link)

**Form:** Kept as-is below the contact info. Submit button text stays "Send Message."

---

## Data Changes Summary (`SITE_DATA` in `App.tsx`)

| Field | Change |
|-------|--------|
| `experience.dev` | Add new top entry: AI Engineering / Building in Public |
| `projects.human` | Add Summit Ridge Digital card (or update Mobile HQ link) |
| Typewriter text | `replace("Chaos", "Clarity")` → `ship("in", "public")` |

## New Components / Sections

| Section | Type | File impact |
|---------|------|-------------|
| `WhatMakesMeDifferent` | New JSX section in `App.tsx` | Inline in App.tsx, or extracted to `components/WhatMakesMeDifferent.tsx` |
| `AIStack` | New JSX section in `App.tsx` | Inline in App.tsx, or extracted to `components/AIStack.tsx` |

## Contact Info Added

- Email: `brcoldir@gmail.com`
- Cell: `(574) 806-5895`

Both displayed publicly above the contact form on the Let's Talk section.

## Sections Not Changed

- PageLayout / Nav
- Footer
- ChatWidget
- Education section content
- Coldiron.tsx (SEO page)
- ManageAI.tsx
