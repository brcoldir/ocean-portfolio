# Portfolio Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure oceancoldiron.com to lead with "building in public / AI enthusiast" energy — new section order, two new sections (WhatMakesMeDifferent, AIStack), updated CTA with public contact info.

**Architecture:** All changes are in `frontend/src/App.tsx`. New data constants (`DIFFERENTIATORS`, `STACK`) are added above the component. New JSX sections are inserted inline in the `home` variable. No new files needed — App.tsx is the single source of truth for this page.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React icons, Vite

## Global Constraints

- Both `dev` and `human` modes must be implemented for every new section
- No new npm packages — use only Lucide icons already imported
- Tailwind only — no inline style objects except where already used (e.g. progress bars)
- Dev mode palette: `bg-[#0a0f1e]`, `bg-slate-950`, `border-slate-800`, `text-blue-400`, `text-slate-400`
- Human mode palette: `bg-[#f4f1ea]`, `bg-white`, `border-stone-200`, `text-orange-600`, `text-stone-600`
- Contact info to display publicly: `brcoldir@gmail.com`, `(574) 806-5895`
- Spec: `docs/superpowers/specs/2026-07-08-portfolio-restructure-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `frontend/src/App.tsx` | Modify | All tasks below |

---

## Task 1: Add DIFFERENTIATORS and STACK data constants

**Files:**
- Modify: `frontend/src/App.tsx` — add two new constants between `SITE_DATA` and the `Typewriter` component (around line 131)

**Interfaces:**
- Produces: `DIFFERENTIATORS` (used by Task 3), `STACK` (used by Task 4)

- [ ] **Step 1: Insert the DIFFERENTIATORS and STACK constants**

Find this comment in App.tsx (around line 132):
```tsx
// --- COMPONENT: TYPEWRITER EFFECT ---
```

Insert the following block immediately before that comment:

```tsx
// --- DATA: DIFFERENTIATORS ---
const DIFFERENTIATORS: Record<'dev' | 'human', { icon: React.ElementType; title: string; body: string }[]> = {
  dev: [
    {
      icon: Server,
      title: "Healthcare Integration Depth",
      body: "HL7, Mirth Connect, 200+ enterprise clients. 95% reduction in critical incident recurrence. 75% improvement in MTTR. The messy real-world systems AI has to actually plug into.",
    },
    {
      icon: Brain,
      title: "AI Engineering Momentum",
      body: "Building now with RAG, MCP, Databricks, Lakebase, Claude Code, and agentic workflows. Not studying AI — shipping it.",
    },
    {
      icon: Briefcase,
      title: "Entrepreneur + Product Builder",
      body: "Founded businesses. Built EZPostScheduler from idea to production SaaS — Go, React, Postgres, AWS, Stripe, OAuth. Full-stack ownership, not just tickets.",
    },
    {
      icon: GraduationCap,
      title: "Systems Thinking + Business Depth",
      body: "15+ years across enterprise, healthcare, and cloud. MBA (3.9 GPA), PMP certified. Bridges engineering, customers, and business outcomes.",
    },
  ],
  human: [
    {
      icon: Youtube,
      title: "Outdoor Creator",
      body: "100k+ YouTube subscribers. Adventure storytelling through Brandon Coldiron Outdoors and Ocean Outdoors. Building an audience around real, hard things.",
    },
    {
      icon: Mountain,
      title: "46/50 State High Points",
      body: "One deliberate goal, pursued over years. Denali 2028. Discipline isn't a trait — it's a practice.",
    },
    {
      icon: Code,
      title: "Builder Who Ships",
      body: "EZPostScheduler, Summit Ridge Digital, OceanColdiron.com. Ideas become real things. Imperfect first, improved always.",
    },
    {
      icon: Brain,
      title: "Building with AI",
      body: "Not just using AI — building with it. RAG, MCP, Claude Code. Sharing what I learn in public.",
    },
  ],
};

// --- DATA: TECH STACK ---
const STACK: Record<'dev' | 'human', { label: string; tags: string[] }[]> = {
  dev: [
    { label: "LLM & Agents", tags: ["Claude", "Claude Code", "RAG", "MCP", "FastMCP", "Agentic Workflows", "Prompt Engineering"] },
    { label: "Data & Platform", tags: ["Databricks", "Lakebase", "FastAPI", "PostgreSQL", "AWS"] },
    { label: "Languages & Frameworks", tags: ["Go", "React", "TypeScript", "Python", "Java / Spring Boot"] },
    { label: "Healthcare Interop", tags: ["HL7", "FHIR", "Mirth Connect", "EHR / Practice Mgmt", "OAuth2"] },
  ],
  human: [
    { label: "Out There", tags: ["Garmin inReach", "Starlink", "Grand Design RV", "Hiking Boots"] },
    { label: "Creating", tags: ["Final Cut Pro", "DJI", "iPhone", "YouTube"] },
    { label: "Building", tags: ["Claude Code", "Go", "React", "AWS"] },
    { label: "Moving", tags: ["Running Shoes", "Trekking Poles", "Crampons"] },
  ],
};

```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No TypeScript errors. Build may warn about bundle size — that's fine.

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: add DIFFERENTIATORS and STACK data constants"
```

---

## Task 2: Update SITE_DATA (typewriter text, AI pivot entry, Summit Ridge Digital)

**Files:**
- Modify: `frontend/src/App.tsx` — three targeted edits inside `SITE_DATA`

**Interfaces:**
- Consumes: existing `SITE_DATA` shape
- Produces: updated `SITE_DATA.experience.dev` (used by experience timeline), updated `SITE_DATA.projects.human` (used by projects grid), updated typewriter text

- [ ] **Step 1: Update the typewriter text**

Find this line (around line 253):
```tsx
<span className="text-blue-500">func</span> <span className="text-yellow-300">init</span>() &#123; <Typewriter text='replace("Chaos", "Clarity")' startDelay={500} />
```

Replace with:
```tsx
<span className="text-blue-500">func</span> <span className="text-yellow-300">build</span>() &#123; <Typewriter text='ship("in", "public")' startDelay={500} />
```

- [ ] **Step 2: Add AI Engineering pivot entry to experience.dev**

Find the `experience.dev` array in `SITE_DATA` (around line 81). It starts with:
```tsx
dev: [
  { year: "2021 - Present", role: "Integration Consultant II", company: "ModMed", desc: "Completed ModMed's inaugural AI Acceleration intensive...
```

Insert a new entry as the **first item** in that array, before the ModMed entry:
```tsx
dev: [
  { year: "2025 – Present", role: "AI Engineering | Building in Public", company: "Personal Projects + ModMed AI Initiative", desc: "Actively building with RAG, MCP, Databricks, Lakebase, Claude Code, and agentic workflows. Contributing to ModMed's AI acceleration initiative. Shipping personal AI projects in public — portfolio chatbot, MCP servers, healthcare automation concepts." },
  { year: "2021 - Present", role: "Integration Consultant II", company: "ModMed", ...
```

- [ ] **Step 3: Add Summit Ridge Digital to projects.human**

Find the `projects.human` array in `SITE_DATA` (around line 114). It currently has 3 entries. Add a 4th:
```tsx
human: [
  { title: "Ocean Outdoors", ... },
  { title: "Project 50", ... },
  { title: "The Mobile HQ", ... },
  { title: "Summit Ridge Digital", desc: "Web design, hosting, and digital services for small businesses. Because not every business needs a dev team — just a reliable partner.", tags: ["Web Design", "Hosting", "AWS", "Small Business"], link: "https://summitridgedigital.com" },
]
```

- [ ] **Step 4: Verify build**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No errors.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: update SITE_DATA — typewriter, AI pivot entry, Summit Ridge Digital"
```

---

## Task 3: Add WhatMakesMeDifferent section (after Hero, before About)

**Files:**
- Modify: `frontend/src/App.tsx` — insert new JSX section

**Interfaces:**
- Consumes: `DIFFERENTIATORS` (from Task 1), `mode` prop
- Produces: rendered section between Hero and About

- [ ] **Step 1: Insert WhatMakesMeDifferent section**

Find this comment in the `home` variable (around line 324):
```tsx
      {/* The Dual Content Section */}
      <section id="about" className={`py-24 px-6 transition-colors duration-500 ${mode === 'dev' ? 'bg-slate-900/50 border-y border-slate-800' : 'bg-stone-100 border-y border-stone-200'}`}>
```

Insert the following block **immediately before** that comment:

```tsx
      {/* What Makes Me Different */}
      <section className={`py-24 px-6 ${mode === 'dev' ? 'bg-[#0a0f1e]' : 'bg-[#f4f1ea]'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold mb-3 ${mode === 'dev' ? 'font-mono' : 'font-serif'}`}>
              {mode === 'dev' ? '// Why Ocean?' : 'What makes me, me.'}
            </h2>
            <p className={`text-sm opacity-60 ${mode === 'dev' ? 'font-mono text-slate-400' : 'text-stone-500'}`}>
              {mode === 'dev' ? "The combination that doesn't show up on a resume." : "The stuff that actually matters."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIFFERENTIATORS[mode].map((item, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-2xl border transition-all hover:-translate-y-1 ${
                  mode === 'dev'
                    ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/10'
                    : 'bg-white border-stone-200 shadow-sm hover:shadow-lg'
                }`}
              >
                <div className={`p-3 rounded-xl w-fit mb-4 ${mode === 'dev' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-600'}`}>
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className={`text-sm leading-relaxed ${mode === 'dev' ? 'text-slate-400' : 'text-stone-600'}`}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

```

- [ ] **Step 2: Verify build**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No errors.

- [ ] **Step 3: Start dev server and visually verify**

```powershell
cd frontend; npm run dev
```

Open http://localhost:5173 in browser. Verify:
- Dev mode: dark section with `// Why Ocean?` heading, 4 cards in 2×2 grid, blue accent icons
- Human mode: warm section with `What makes me, me.` heading, 4 cards in 2×2 grid, orange accent icons
- Section appears between Hero and About on both modes
- Cards have hover lift effect

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: add WhatMakesMeDifferent section"
```

---

## Task 4: Add AIStack section (after Experience, before Projects)

**Files:**
- Modify: `frontend/src/App.tsx` — insert new JSX section

**Interfaces:**
- Consumes: `STACK` (from Task 1), `mode` prop
- Produces: rendered section between Experience and Projects

- [ ] **Step 1: Insert AIStack section**

Find this comment in the `home` variable (around line 513, now shifted by WhatMakesMeDifferent insertion):
```tsx
      {/* Projects Grid (SPLIT) */}
```

Insert the following block **immediately before** that comment:

```tsx
      {/* AI Stack / Gear & Tools */}
      <section className={`py-24 px-6 ${mode === 'dev' ? 'bg-slate-900/30 border-y border-slate-800' : 'bg-stone-50 border-y border-stone-200'}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold mb-3 ${mode === 'dev' ? 'font-sans' : 'font-serif'}`}>
              {mode === 'dev' ? 'Tech Stack' : 'Gear & Tools'}
            </h2>
            <p className={`text-sm opacity-60 ${mode === 'dev' ? 'font-mono text-slate-400' : 'text-stone-500'}`}>
              {mode === 'dev' ? 'What I actually build with.' : 'What I carry.'}
            </p>
          </div>
          <div className="space-y-8">
            {STACK[mode].map((group, gIdx) => (
              <div key={gIdx}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${mode === 'dev' ? 'text-slate-500' : 'text-stone-400'}`}>
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all hover:scale-105 cursor-default ${
                        mode === 'dev'
                          ? 'bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-300'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

```

- [ ] **Step 2: Verify build**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No errors.

- [ ] **Step 3: Visually verify (dev server should still be running)**

Open http://localhost:5173. Scroll to Tech Stack section. Verify:
- Dev mode: `Tech Stack` heading, 4 labeled groups of pills, blue pill hover
- Human mode: `Gear & Tools` heading, 4 labeled groups, orange pill hover
- Section appears between Experience and Projects

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: add AIStack section"
```

---

## Task 5: Swap Education and Projects order

**Files:**
- Modify: `frontend/src/App.tsx` — move Education section to after Projects

**Interfaces:**
- Consumes: existing Education and Projects JSX sections
- Produces: Projects before Education in the page order

- [ ] **Step 1: Locate both sections**

In `App.tsx`, find the Education section opening comment:
```tsx
      {/* Education Section (ONLY SHOW IN DEV MODE for Cleanliness, or keep both?) Let's keep both. */}
      <section id="education" ...
```

And the Projects section opening comment:
```tsx
      {/* Projects Grid (SPLIT) */}
      <section id="projects" ...
```

Currently Education appears first (before Projects). Cut the entire Education section block (from its opening comment through its closing `</section>`) and paste it **after** the Projects section's closing `</section>`.

The resulting order should be:
```
{/* AI Stack / Gear & Tools */}   ← from Task 4
{/* Projects Grid (SPLIT) */}
{/* Education Section ... */}      ← moved here
{/* Contact Section */}
```

- [ ] **Step 2: Verify build**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No errors.

- [ ] **Step 3: Visually verify**

Open http://localhost:5173. Scroll through the full page. Verify order:
1. Hero
2. What Makes Me Different
3. About + Skills
4. Experience
5. Tech Stack / Gear & Tools
6. Projects
7. Education
8. Let's Connect (contact form — not updated yet)
9. Footer

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: move Education section after Projects"
```

---

## Task 6: Rewrite Let's Talk CTA (rename, copy, add public contact info)

**Files:**
- Modify: `frontend/src/App.tsx` — update Contact section JSX

**Interfaces:**
- Consumes: existing contact form state (`contactForm`, `handleSubmit`, `isSubmitting`, `submitStatus`)
- Produces: updated section with new heading, mode-specific copy, email + phone displayed above form

- [ ] **Step 1: Update the Contact section**

Find the Contact section (around line 580, now shifted):
```tsx
      {/* Contact Section */}
      <section id="contact" className={`py-24 px-6 ${mode === 'dev' ? 'bg-gradient-to-b from-[#0a0f1e] to-slate-950' : 'bg-stone-100'}`}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Let's Connect</h2>
          <p className="mb-10 opacity-70">
            {mode === 'dev'
              ? "Ready to collaborate on scalable systems or AI architecture?"
              : "Whether it's about tech, business, or the best way to fell a tree, I'm all ears."}
          </p>
```

Replace that opening block (heading + subtext paragraph) with:
```tsx
      {/* Contact Section */}
      <section id="contact" className={`py-24 px-6 ${mode === 'dev' ? 'bg-gradient-to-b from-[#0a0f1e] to-slate-950' : 'bg-stone-100'}`}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Let's Talk</h2>
          <p className="mb-8 opacity-70">
            {mode === 'dev'
              ? "I'm building in public with AI and always interested in talking shop — healthcare tech, agentic systems, or whatever hard problem you're working on. Not hunting for a role, just growing in the open."
              : "Adventures, ideas, collabs — hit me up. I like real conversations with people doing interesting things."}
          </p>

          <div className={`flex flex-col sm:flex-row justify-center gap-4 mb-10`}>
            <a
              href="mailto:brcoldir@gmail.com"
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-medium transition-all hover:scale-105 ${
                mode === 'dev'
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-blue-500/50 hover:text-blue-300'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-orange-300 shadow-sm'
              }`}
            >
              <Mail size={18} />
              brcoldir@gmail.com
            </a>
            <a
              href="tel:+15748065895"
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-medium transition-all hover:scale-105 ${
                mode === 'dev'
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-blue-500/50 hover:text-blue-300'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-orange-300 shadow-sm'
              }`}
            >
              <Send size={18} />
              (574) 806-5895
            </a>
          </div>
```

- [ ] **Step 2: Verify the rest of the form is still intact**

Check that after your edit, the `<form onSubmit={handleSubmit} ...>` block and all its inputs are still present and the closing `</div></section>` tags are balanced.

- [ ] **Step 3: Verify build**

```powershell
cd frontend; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: No errors.

- [ ] **Step 4: Visually verify**

Open http://localhost:5173 and scroll to the bottom. Verify:
- Heading reads "Let's Talk" (not "Let's Connect")
- Dev mode subtext: "I'm building in public with AI..."
- Human mode subtext: "Adventures, ideas, collabs..."
- Email button visible, links to `mailto:brcoldir@gmail.com`
- Phone button visible, links to `tel:+15748065895`
- Contact form still present below the buttons
- Submit button still works (test a submission)

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/App.tsx
git commit -m "feat: rewrite Let's Talk CTA with public contact info"
```

---

## Task 7: Final QA and ship

**Files:**
- Run: `ship-it.ps1`

- [ ] **Step 1: Full visual pass — dev mode**

Open http://localhost:5173 (dev server). Toggle to dev mode. Scroll through entire page and confirm:
- [ ] Hero: typewriter shows `ship("in", "public")`
- [ ] What Makes Me Different: `// Why Ocean?` heading, 4 blue-accent cards
- [ ] About + Skills: unchanged
- [ ] Experience: "AI Engineering | Building in Public" entry at top of timeline
- [ ] Tech Stack: 4 labeled pill groups (LLM & Agents, Data & Platform, etc.)
- [ ] Projects: 3 dev cards (EZPostScheduler links to ezpostscheduler.com)
- [ ] Education: appears after Projects
- [ ] Let's Talk: new heading, new copy, email + phone buttons, form below

- [ ] **Step 2: Full visual pass — human mode**

Toggle to human mode. Verify:
- [ ] What Makes Me Different: `What makes me, me.` heading, 4 orange-accent cards
- [ ] Gear & Tools: 4 labeled pill groups (Out There, Creating, Building, Moving)
- [ ] Projects: 4 cards (Ocean Outdoors, Project 50, Mobile HQ, Summit Ridge Digital linking to summitridgedigital.com)
- [ ] Let's Talk: human mode copy visible

- [ ] **Step 3: Mobile check**

Resize browser to 375px width. Verify:
- [ ] WhatMakesMeDifferent cards stack to single column (sm:grid-cols-2 means 1 col on mobile)
- [ ] AIStack pills wrap cleanly
- [ ] Let's Talk contact buttons stack vertically on narrow screens

- [ ] **Step 4: Ship**

```powershell
cd "C:\Projects\my-portfolio"
.\ship-it.ps1
```

Expected output ends with:
```
DEPLOYMENT COMPLETE!
Check it out: https://oceancoldiron.com
```

- [ ] **Step 5: Verify live site**

Open https://oceancoldiron.com. Confirm all 8 sections are live and both modes work correctly.
