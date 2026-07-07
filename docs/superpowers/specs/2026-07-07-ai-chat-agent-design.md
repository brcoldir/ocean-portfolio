# AI Chat Agent — Design Spec
**Date:** 2026-07-07
**Project:** oceancoldiron.com portfolio
**Status:** Approved, ready for implementation

---

## 1. Overview

Add a RAG-grounded AI chat agent to the portfolio website that lets visitors ask anything about Ocean Coldiron (Brandon Coldiron) — career, projects, adventures, entrepreneurship, high points quest, what excites him, etc. The agent never hallucinates: it only answers from its knowledge base and says it doesn't know when a topic isn't covered. Pay range and compensation are explicitly off-limits.

Voice is supported bidirectionally via ElevenLabs: visitors can speak to the agent (STT) and have responses read aloud (TTS). An admin page at `/manageai` lets Ocean view conversation history and edit the RAG knowledge base in-browser.

---

## 2. Architecture

### Stack
- **Frontend:** React + TypeScript + Tailwind CSS (existing)
- **Backend:** Go HTTP server (existing `main.go`, refactored into packages)
- **AI:** Anthropic Claude Haiku (low cost, RAG-anchored)
- **Voice:** ElevenLabs STT (transcription) + TTS (playback)
- **Storage:** SQLite via `modernc.org/sqlite` (no CGO required, runs on t2.nano)
- **Auth:** bcrypt password hashing + JWT in httpOnly cookie + Gmail SMTP for password reset
- **Hosting:** AWS EC2 t2.nano (existing)

### Folder Structure

```
my-portfolio/
├── main.go                        # entry point, route registration
├── handlers/
│   ├── chat.go                    # /api/chat, /api/chat/transcribe, /api/chat/speak
│   ├── auth.go                    # /api/auth/login, /api/auth/logout, /api/auth/reset-request, /api/auth/reset-confirm
│   └── admin.go                   # /api/admin/conversations, /api/admin/rag
├── middleware/
│   ├── ratelimit.go               # per-IP rate limiting (in-memory)
│   └── authmw.go                  # JWT cookie validation
├── db/
│   └── db.go                      # SQLite schema, migrations, query helpers
├── rag/
│   ├── career.md
│   ├── adventures.md
│   ├── entrepreneurship.md
│   └── personal.md
├── data/
│   └── portfolio.db               # SQLite database (gitignored)
└── frontend/src/
    ├── components/
    │   └── ChatWidget.tsx          # floating chat UI
    └── pages/
        └── ManageAI.tsx            # admin page
```

### Data Flow — Chat Message

```
User types/speaks
    → POST /api/chat {sessionId, message, voiceEnabled}
    → Rate limiter: 20 req/min per IP, 100 req/day per IP
    → Message length validated: max 500 chars
    → Load all RAG markdown files into system prompt
    → Fetch last 20 messages for this sessionId from SQLite
    → Call Claude Haiku API (system + history + new message)
    → Save user message + assistant reply to SQLite
    → Return text response (+ trigger TTS if voiceEnabled)
```

### Data Flow — Voice Input

```
User clicks mic → browser MediaRecorder captures WebM/opus
    → POST /api/chat/transcribe {audio: base64}
    → Go sends to ElevenLabs STT API → returns transcript text
    → Frontend populates input field with transcript
    → Normal /api/chat flow continues
```

### Data Flow — Voice Output

```
Claude text response arrives
    → if speaker toggle is ON:
    → POST /api/chat/speak {text}
    → Go sends to ElevenLabs TTS API → streams MP3 audio
    → Frontend plays audio via Web Audio API
```

---

## 3. Environment Variables

```env
# Existing
GMAIL_USER=your@gmail.com
GMAIL_PASS=your-app-password

# New
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
JWT_SECRET=<long random string, min 32 chars>
ADMIN_EMAIL=brcoldir@gmail.com
```

---

## 4. Database Schema

```sql
-- Chat sessions (one per browser visit)
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,   -- UUID
    ip          TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual messages within a session
CREATE TABLE messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT NOT NULL REFERENCES sessions(id),
    role         TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content      TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Single admin user
CREATE TABLE admin_user (
    id              INTEGER PRIMARY KEY CHECK(id = 1),  -- enforces single row
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,                      -- bcrypt
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE reset_tokens (
    token       TEXT PRIMARY KEY,
    expires_at  DATETIME NOT NULL,
    used        BOOLEAN DEFAULT FALSE
);

-- Per-IP rate limiting counters
CREATE TABLE rate_limits (
    ip          TEXT NOT NULL,
    window      TEXT NOT NULL,                          -- 'minute' or 'day'
    count       INTEGER DEFAULT 0,
    reset_at    DATETIME NOT NULL,
    PRIMARY KEY (ip, window)
);
```

---

## 5. Security

### Chat Endpoint
- **Rate limiting:** 20 requests/min per IP, 100 requests/day per IP. Exceeding either returns HTTP 429 with a `Retry-After` header.
- **Message length:** Max 500 characters. Requests exceeding this return HTTP 400.
- **No credentials in browser:** Anthropic and ElevenLabs API keys live only in Go env vars. The frontend never sees them.
- **Session IDs:** Generated as UUIDs client-side, stored in `localStorage`. No auth required to chat — sessions are anonymous.

### Admin Auth
- **Password storage:** bcrypt with cost factor 12.
- **Session:** JWT (HS256) signed with `JWT_SECRET`, stored in an httpOnly, Secure, SameSite=Strict cookie. 24-hour expiry.
- **Login rate limiting:** 5 failed attempts per IP triggers a 15-minute lockout.
- **Password reset:** HMAC-signed token emailed via Gmail SMTP. Token expires in 15 minutes and is single-use.
- **`/manageai` route:** React route renders a login wall if no valid JWT cookie present. All `/api/admin/*` endpoints validate JWT server-side — the React check is UI-only.

### RAG Document Updates (Admin)
- Edits to RAG docs via the admin UI are saved to the `rag/` folder on disk by the Go server.
- No shell execution, no file path traversal — filenames are a fixed allowlist (`career.md`, `adventures.md`, `entrepreneurship.md`, `personal.md`).

---

## 6. AI Behavior

### System Prompt Structure
```
You are Ocean Coldiron's personal AI assistant on his portfolio website.
Your job is to answer questions about Ocean based ONLY on the information
provided below. If you don't know the answer from the provided context,
say "I don't have that information, but you can reach Ocean directly at
brcoldir@gmail.com." Never guess or invent details.

Never discuss compensation, salary, pay rates, or income — for any reason.
Keep responses concise (2–4 sentences unless detail is explicitly requested).

--- KNOWLEDGE BASE ---
[contents of all RAG markdown files, concatenated]
--- END KNOWLEDGE BASE ---
```

### Conversation History
- Last 20 messages per session passed to Claude on every request.
- Each message trimmed to 1000 chars before being added to history (prevents prompt bloat from very long prior turns).
- Sessions have no expiry — history persists in SQLite indefinitely until deleted from admin UI.

### Model
- **Model:** `claude-haiku-4-5-20251001`
- **Max output tokens:** 512 (keeps responses tight and cheap)
- **Temperature:** 0.3 (low randomness — accurate, grounded responses)

---

## 7. Chat Widget UI

**Placement:** Fixed, bottom-right corner of every page. Z-index above all other content.

**Closed state:** A 48px pill button.
- Dev mode: dark background, blue glow, label `Ask Ocean_`
- Human mode: warm white, orange accent, label `Chat with Ocean`

**Open state:** 340px wide × 480px tall panel, above the button.
- **Header:** "Ask me anything" + speaker toggle icon + close (×) button
- **Messages area:** Scrollable. User bubbles right-aligned, assistant bubbles left-aligned. Styled per dev/human mode.
- **Input row:** Mic button | Text input (500 char max with counter) | Send button
- **Voice states:**
  - Mic idle: grey
  - Mic recording: red pulsing + "Listening…" replaces input
  - Speaker on: assistant responses auto-play as audio
  - Speaker off: text only (default)

**Mode-aware styling:**

| Element        | Dev mode                     | Human mode              |
|----------------|------------------------------|-------------------------|
| Panel bg       | `bg-slate-950`               | `bg-white`              |
| Accent         | `blue-500`                   | `orange-500`            |
| Assistant text | `slate-300`, monospace       | `stone-700`, normal     |
| User bubble    | `bg-slate-800`               | `bg-stone-100`          |
| Button glow    | `shadow-blue-500/30`         | `shadow-orange-500/20`  |

---

## 8. `/manageai` Admin Page

**Route:** `/manageai` — protected React route, renders login wall without valid JWT.

### Login Screen
- Email + password fields
- "Forgot password?" link → triggers email reset flow
- 5-attempt lockout displayed to user with countdown

### Tab 1: Conversations
- Table: date, message count, visitor IP, actions (View, Delete)
- Expandable rows show full message thread
- Search by date range or keyword
- Export all to CSV

### Tab 2: RAG Documents
- List of the four fixed RAG files with last-edited timestamp
- Click Edit → inline markdown editor with live preview (split pane)
- Save button → PUT `/api/admin/rag/{filename}` → Go writes to disk
- Changes take effect on the next chat request (no redeploy)

---

## 9. RAG Document Topics

Initial content to be written for each file:

| File | Topics |
|------|--------|
| `career.md` | Work history (ModMed, Snap-On, Lakeshore, Cerner), skills (Go, AI/LLM, AWS, HL7/FHIR, SQL), projects (EZPostScheduler, Healthcare Interop Engine, Summit Ridge Digital), education (CSU MBA, IU Informatics) |
| `adventures.md` | RV life, full-time travel since 2023, high points project (39/50 states), Denali 2027 goal, Ocean Outdoors YouTube (100k+ subs), philosophy on discomfort and growth |
| `entrepreneurship.md` | Coldiron Auto Transport, RC Lawn and Tree, Summit Ridge Digital, EZPostScheduler, lessons learned as founder/CEO |
| `personal.md` | What excites Ocean (AI, systems thinking, outdoor endurance, building things), social links, contact email, values, approach to life and work |

---

## 10. Cost Estimate (Monthly, moderate usage)

| Service | Estimate |
|---------|----------|
| Claude Haiku (~5k messages/mo) | ~$1.25 |
| ElevenLabs TTS (~500k chars/mo) | ~$7.50 |
| ElevenLabs STT (~30 min audio/mo) | ~$0.20 |
| EC2 t2.nano | existing |
| **Total new cost** | **~$9–10/mo** |

Rate limits keep worst-case abuse bounded to ~$15/mo.

---

## 11. Out of Scope

- Multi-user admin accounts
- Vector database / semantic search (all RAG fits in system prompt)
- GitHub integration
- Ocean's compensation, salary, or pay expectations
- Any external analytics service (Mixpanel, GA, etc.) — SQLite conversation log covers this
