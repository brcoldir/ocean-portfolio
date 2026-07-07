# AI Chat Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a RAG-grounded Claude Haiku chat widget with ElevenLabs voice I/O, SQLite conversation storage, and a JWT-secured `/manageai` admin page to the existing Go + React portfolio.

**Architecture:** The existing Go HTTP server gains three handler packages (`handlers`, `middleware`, `db`) wired through a refactored `main.go`. The React frontend gains a floating `ChatWidget` component and a protected `ManageAI` page. All AI API keys stay server-side; the browser only talks to `/api/*` on the same origin.

**Tech Stack:** Go 1.22+ (stdlib routing with `{pathValue}`), `modernc.org/sqlite` (pure Go, no CGO), `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt`, React 18 + TypeScript + Tailwind CSS, Anthropic Claude Haiku API (direct HTTP), ElevenLabs API (direct HTTP).

## Global Constraints

- Module path: `github.com/brandoncoldiron/portfolio`
- SQLite file: `./data/portfolio.db` (directory auto-created on startup; path gitignored)
- RAG files: `./rag/{career,adventures,entrepreneurship,personal}.md` — fixed allowlist, no traversal
- Rate limits: 20 req/min + 100 req/day per IP (chat endpoints); 5 login failures → 15-min lockout
- Max chat message: 500 characters; max output tokens: 512; history: last 20 messages, each trimmed to 1000 chars
- Claude model: `claude-haiku-4-5-20251001`; temperature: 0.3
- JWT: HS256, httpOnly + Secure + SameSite=Strict cookie, 24-hour expiry
- bcrypt cost: 12
- Never expose `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, or `JWT_SECRET` to the browser

---

### Task 1: Go dependencies + DB package

**Files:**
- Modify: `go.mod`
- Create: `db/db.go`
- Create: `db/db_test.go`
- Modify: `.gitignore` (add `data/`)

**Interfaces:**
- Produces:
  - `db.Open(path string) (*DB, error)`
  - `(*DB).CreateSchema() error`
  - `(*DB).EnsureSession(id, ip string) error`
  - `(*DB).SaveMessage(sessionID, role, content string) error`
  - `(*DB).GetRecentMessages(sessionID string, limit int) ([]Message, error)`
  - `(*DB).GetAdminUser() (*AdminUser, error)`
  - `(*DB).UpsertAdminUser(email, passwordHash string) error`
  - `(*DB).CreateResetToken(token string, expiresAt time.Time) error`
  - `(*DB).UseResetToken(token string) (bool, error)`
  - `(*DB).ListSessions() ([]SessionSummary, error)`
  - `(*DB).GetSessionMessages(sessionID string) ([]Message, error)`
  - `(*DB).DeleteSession(sessionID string) error`
  - Types: `Message`, `AdminUser`, `SessionSummary`

- [ ] **Step 1: Add dependencies**

```bash
cd C:\Projects\my-portfolio
go get modernc.org/sqlite
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto/bcrypt
```

Expected: `go.mod` and `go.sum` updated with three new dependencies.

- [ ] **Step 2: Add `data/` to .gitignore**

Add this line to `C:\Projects\my-portfolio\.gitignore`:
```
/data/
```

- [ ] **Step 3: Write the failing tests**

Create `db/db_test.go`:
```go
package db_test

import (
	"os"
	"testing"
	"time"

	"github.com/brandoncoldiron/portfolio/db"
)

func setupDB(t *testing.T) *db.DB {
	t.Helper()
	f, err := os.CreateTemp("", "portfolio-test-*.db")
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	t.Cleanup(func() { os.Remove(f.Name()) })

	database, err := db.Open(f.Name())
	if err != nil {
		t.Fatal(err)
	}
	if err := database.CreateSchema(); err != nil {
		t.Fatal(err)
	}
	return database
}

func TestEnsureSession(t *testing.T) {
	d := setupDB(t)
	if err := d.EnsureSession("sess-1", "1.2.3.4"); err != nil {
		t.Fatal(err)
	}
	// idempotent
	if err := d.EnsureSession("sess-1", "1.2.3.4"); err != nil {
		t.Fatal(err)
	}
}

func TestSaveAndGetMessages(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("sess-1", "1.2.3.4")
	d.SaveMessage("sess-1", "user", "hello")
	d.SaveMessage("sess-1", "assistant", "hi there")

	msgs, err := d.GetRecentMessages("sess-1", 20)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].Role != "user" {
		t.Errorf("expected first message role=user, got %s", msgs[0].Role)
	}
}

func TestGetRecentMessages_Limit(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("sess-1", "1.2.3.4")
	for i := 0; i < 25; i++ {
		d.SaveMessage("sess-1", "user", "msg")
	}
	msgs, err := d.GetRecentMessages("sess-1", 20)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 20 {
		t.Fatalf("expected 20 messages (limit), got %d", len(msgs))
	}
}

func TestAdminUser(t *testing.T) {
	d := setupDB(t)
	user, err := d.GetAdminUser()
	if err != nil {
		t.Fatal(err)
	}
	if user != nil {
		t.Fatal("expected no user initially")
	}

	if err := d.UpsertAdminUser("admin@test.com", "hash123"); err != nil {
		t.Fatal(err)
	}
	user, err = d.GetAdminUser()
	if err != nil || user == nil {
		t.Fatal("expected user after upsert")
	}
	if user.Email != "admin@test.com" {
		t.Errorf("expected email admin@test.com, got %s", user.Email)
	}
}

func TestResetToken(t *testing.T) {
	d := setupDB(t)
	expires := time.Now().Add(15 * time.Minute)
	if err := d.CreateResetToken("tok123", expires); err != nil {
		t.Fatal(err)
	}
	ok, err := d.UseResetToken("tok123")
	if err != nil || !ok {
		t.Fatal("expected token to be valid")
	}
	// token is single-use
	ok, err = d.UseResetToken("tok123")
	if err != nil || ok {
		t.Fatal("expected token to be consumed")
	}
}

func TestResetToken_Expired(t *testing.T) {
	d := setupDB(t)
	d.CreateResetToken("expired", time.Now().Add(-1*time.Minute))
	ok, err := d.UseResetToken("expired")
	if err != nil || ok {
		t.Fatal("expected expired token to fail")
	}
}

func TestListAndDeleteSessions(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("s1", "1.1.1.1")
	d.EnsureSession("s2", "2.2.2.2")
	d.SaveMessage("s1", "user", "hello")

	sessions, err := d.ListSessions()
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}

	if err := d.DeleteSession("s1"); err != nil {
		t.Fatal(err)
	}
	sessions, _ = d.ListSessions()
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session after delete, got %d", len(sessions))
	}
}
```

- [ ] **Step 4: Run tests — expect FAIL (package doesn't exist yet)**

```bash
go test ./db/...
```

Expected: `cannot find package "github.com/brandoncoldiron/portfolio/db"`

- [ ] **Step 5: Write `db/db.go`**

Create `db/db.go`:
```go
package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct{ *sql.DB }

type Message struct {
	ID        int64
	SessionID string
	Role      string
	Content   string
	CreatedAt time.Time
}

type AdminUser struct {
	Email        string
	PasswordHash string
}

type SessionSummary struct {
	ID           string
	IP           string
	MessageCount int
	CreatedAt    time.Time
}

func Open(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	return &DB{sqlDB}, nil
}

func (d *DB) CreateSchema() error {
	_, err := d.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id         TEXT PRIMARY KEY,
			ip         TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS messages (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
			content    TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS admin_user (
			id            INTEGER PRIMARY KEY CHECK(id = 1),
			email         TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS reset_tokens (
			token      TEXT PRIMARY KEY,
			expires_at TEXT NOT NULL,
			used       INTEGER DEFAULT 0
		);
	`)
	return err
}

func (d *DB) EnsureSession(id, ip string) error {
	_, err := d.Exec(`INSERT OR IGNORE INTO sessions (id, ip) VALUES (?, ?)`, id, ip)
	return err
}

func (d *DB) SaveMessage(sessionID, role, content string) error {
	_, err := d.Exec(
		`INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)`,
		sessionID, role, content,
	)
	return err
}

func (d *DB) GetRecentMessages(sessionID string, limit int) ([]Message, error) {
	rows, err := d.Query(`
		SELECT id, session_id, role, content, created_at FROM messages
		WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
	`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []Message
	for rows.Next() {
		var m Message
		var createdAt string
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &createdAt); err != nil {
			return nil, err
		}
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		msgs = append(msgs, m)
	}
	// reverse: oldest first
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, rows.Err()
}

func (d *DB) GetAdminUser() (*AdminUser, error) {
	var u AdminUser
	err := d.QueryRow(`SELECT email, password_hash FROM admin_user WHERE id = 1`).
		Scan(&u.Email, &u.PasswordHash)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (d *DB) UpsertAdminUser(email, passwordHash string) error {
	_, err := d.Exec(`
		INSERT INTO admin_user (id, email, password_hash) VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash
	`, email, passwordHash)
	return err
}

func (d *DB) CreateResetToken(token string, expiresAt time.Time) error {
	_, err := d.Exec(
		`INSERT INTO reset_tokens (token, expires_at) VALUES (?, ?)`,
		token, expiresAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (d *DB) UseResetToken(token string) (bool, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := d.Exec(`
		UPDATE reset_tokens SET used = 1
		WHERE token = ? AND used = 0 AND expires_at > ?
	`, token, now)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (d *DB) ListSessions() ([]SessionSummary, error) {
	rows, err := d.Query(`
		SELECT s.id, s.ip, COUNT(m.id), s.created_at
		FROM sessions s LEFT JOIN messages m ON m.session_id = s.id
		GROUP BY s.id ORDER BY s.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SessionSummary
	for rows.Next() {
		var s SessionSummary
		var createdAt string
		if err := rows.Scan(&s.ID, &s.IP, &s.MessageCount, &createdAt); err != nil {
			return nil, err
		}
		s.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		out = append(out, s)
	}
	return out, rows.Err()
}

func (d *DB) GetSessionMessages(sessionID string) ([]Message, error) {
	rows, err := d.Query(`
		SELECT id, session_id, role, content, created_at FROM messages
		WHERE session_id = ? ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []Message
	for rows.Next() {
		var m Message
		var createdAt string
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &createdAt); err != nil {
			return nil, err
		}
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func (d *DB) DeleteSession(sessionID string) error {
	_, err := d.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
go test ./db/... -v
```

Expected: all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add db/ go.mod go.sum .gitignore
git commit -m "feat: add SQLite db package with full schema and query helpers"
```

---

### Task 2: Rate limiter middleware

**Files:**
- Create: `middleware/ratelimit.go`
- Create: `middleware/ratelimit_test.go`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `middleware.NewRateLimiter() *RateLimiter`
  - `(*RateLimiter).Allow(ip string) bool` — chat rate limit (20/min, 100/day)
  - `(*RateLimiter).AllowLogin(ip string) bool` — 5 failures → 15-min lockout
  - `(*RateLimiter).RecordLoginFail(ip string)`
  - `(*RateLimiter).ResetLoginFails(ip string)`
  - `(*RateLimiter).Limit(next http.Handler) http.Handler` — middleware wrapper

- [ ] **Step 1: Write failing tests**

Create `middleware/ratelimit_test.go`:
```go
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/brandoncoldiron/portfolio/middleware"
)

func TestAllow_UnderLimit(t *testing.T) {
	rl := middleware.NewRateLimiter()
	for i := 0; i < 20; i++ {
		if !rl.Allow("1.2.3.4") {
			t.Fatalf("expected allow at request %d", i+1)
		}
	}
}

func TestAllow_BlocksAtMinuteLimit(t *testing.T) {
	rl := middleware.NewRateLimiter()
	for i := 0; i < 20; i++ {
		rl.Allow("1.2.3.4")
	}
	if rl.Allow("1.2.3.4") {
		t.Fatal("expected block after 20 requests/min")
	}
}

func TestAllow_DifferentIPs(t *testing.T) {
	rl := middleware.NewRateLimiter()
	for i := 0; i < 20; i++ {
		rl.Allow("1.2.3.4")
	}
	if !rl.Allow("5.6.7.8") {
		t.Fatal("different IP should not be rate limited")
	}
}

func TestLoginLockout(t *testing.T) {
	rl := middleware.NewRateLimiter()
	ip := "9.9.9.9"
	for i := 0; i < 5; i++ {
		if !rl.AllowLogin(ip) {
			t.Fatalf("expected allow at attempt %d", i+1)
		}
		rl.RecordLoginFail(ip)
	}
	if rl.AllowLogin(ip) {
		t.Fatal("expected lockout after 5 failures")
	}
}

func TestLoginReset(t *testing.T) {
	rl := middleware.NewRateLimiter()
	ip := "9.9.9.9"
	for i := 0; i < 5; i++ {
		rl.RecordLoginFail(ip)
	}
	rl.ResetLoginFails(ip)
	if !rl.AllowLogin(ip) {
		t.Fatal("expected allow after reset")
	}
}

func TestLimitMiddleware_Blocks(t *testing.T) {
	rl := middleware.NewRateLimiter()
	handler := rl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "1.2.3.4:1234"

	for i := 0; i < 20; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 at request %d, got %d", i+1, rr.Code)
		}
	}
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rr.Code)
	}
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
go test ./middleware/...
```

Expected: `cannot find package "github.com/brandoncoldiron/portfolio/middleware"`

- [ ] **Step 3: Write `middleware/ratelimit.go`**

Create `middleware/ratelimit.go`:
```go
package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	count   int
	resetAt time.Time
}

type loginState struct {
	fails       int
	lockedUntil time.Time
}

type RateLimiter struct {
	mu         sync.Mutex
	perMinute  map[string]*bucket
	perDay     map[string]*bucket
	loginFails map[string]*loginState
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		perMinute:  make(map[string]*bucket),
		perDay:     make(map[string]*bucket),
		loginFails: make(map[string]*loginState),
	}
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()

	m := rl.perMinute[ip]
	if m == nil || now.After(m.resetAt) {
		m = &bucket{resetAt: now.Add(time.Minute)}
		rl.perMinute[ip] = m
	}
	m.count++
	if m.count > 20 {
		return false
	}

	d := rl.perDay[ip]
	if d == nil || now.After(d.resetAt) {
		d = &bucket{resetAt: now.Add(24 * time.Hour)}
		rl.perDay[ip] = d
	}
	d.count++
	return d.count <= 100
}

func (rl *RateLimiter) AllowLogin(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	ls := rl.loginFails[ip]
	if ls == nil {
		return true
	}
	if time.Now().Before(ls.lockedUntil) {
		return false
	}
	return ls.fails < 5
}

func (rl *RateLimiter) RecordLoginFail(ip string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	ls := rl.loginFails[ip]
	if ls == nil {
		ls = &loginState{}
		rl.loginFails[ip] = ls
	}
	ls.fails++
	if ls.fails >= 5 {
		ls.lockedUntil = time.Now().Add(15 * time.Minute)
	}
}

func (rl *RateLimiter) ResetLoginFails(ip string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.loginFails, ip)
}

func extractIP(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rl.Allow(extractIP(r)) {
			w.Header().Set("Retry-After", "60")
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
go test ./middleware/... -v
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add middleware/ratelimit.go middleware/ratelimit_test.go
git commit -m "feat: add in-memory IP rate limiter middleware"
```

---

### Task 3: JWT auth middleware

**Files:**
- Create: `middleware/authmw.go`
- Create: `middleware/authmw_test.go`

**Interfaces:**
- Consumes: `JWT_SECRET` env var
- Produces:
  - `middleware.GenerateToken() (string, error)`
  - `middleware.Protect(next http.Handler) http.Handler`
  - `middleware.SetAuthCookie(w http.ResponseWriter, token string)`
  - `middleware.ClearAuthCookie(w http.ResponseWriter)`
  - Cookie name constant: `"admin_token"`

- [ ] **Step 1: Write failing tests**

Create `middleware/authmw_test.go`:
```go
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/brandoncoldiron/portfolio/middleware"
)

func TestGenerateAndProtect(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough-32chars")
	defer os.Unsetenv("JWT_SECRET")

	token, err := middleware.GenerateToken()
	if err != nil || token == "" {
		t.Fatalf("expected token, got err: %v", err)
	}

	protected := middleware.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(&http.Cookie{Name: "admin_token", Value: token})

	rr := httptest.NewRecorder()
	protected.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 with valid token, got %d", rr.Code)
	}
}

func TestProtect_NoCookie(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough-32chars")
	defer os.Unsetenv("JWT_SECRET")

	protected := middleware.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	protected.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestProtect_InvalidToken(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough-32chars")
	defer os.Unsetenv("JWT_SECRET")

	protected := middleware.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(&http.Cookie{Name: "admin_token", Value: "not.a.valid.jwt"})
	rr := httptest.NewRecorder()
	protected.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
go test ./middleware/...
```

- [ ] **Step 3: Write `middleware/authmw.go`**

Create `middleware/authmw.go`:
```go
package middleware

import (
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const cookieName = "admin_token"

func GenerateToken() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	claims := jwt.RegisteredClaims{
		Subject:   "admin",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func validateToken(tokenStr string) error {
	secret := os.Getenv("JWT_SECRET")
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !token.Valid {
		return jwt.ErrSignatureInvalid
	}
	return nil
}

func Protect(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(cookieName)
		if err != nil || validateToken(cookie.Value) != nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func SetAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400,
		Path:     "/",
	})
}

func ClearAuthCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
		Path:     "/",
	})
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
go test ./middleware/... -v
```

Expected: all 9 tests (6 from Task 2 + 3 new) pass.

- [ ] **Step 5: Commit**

```bash
git add middleware/authmw.go middleware/authmw_test.go
git commit -m "feat: add JWT auth middleware with cookie management"
```

---

### Task 4: Auth handlers

**Files:**
- Create: `handlers/auth.go`

**Interfaces:**
- Consumes: `db.DB`, `middleware.RateLimiter`, `middleware.GenerateToken`, `middleware.SetAuthCookie`, `middleware.ClearAuthCookie`, env vars `GMAIL_USER`, `GMAIL_PASS`, `ADMIN_EMAIL`, `BASE_URL`
- Produces:
  - `handlers.AuthHandler` struct with fields `DB *db.DB`, `RL *middleware.RateLimiter`
  - `(*AuthHandler).HandleLogin(w, r)`
  - `(*AuthHandler).HandleLogout(w, r)`
  - `(*AuthHandler).HandleResetRequest(w, r)`
  - `(*AuthHandler).HandleResetConfirm(w, r)`

- [ ] **Step 1: Create `handlers/auth.go`**

```go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/brandoncoldiron/portfolio/db"
	"github.com/brandoncoldiron/portfolio/middleware"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB *db.DB
	RL *middleware.RateLimiter
}

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ip := extractIP(r)
	if !h.RL.AllowLogin(ip) {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, `{"error":"too many failed attempts, try again in 15 minutes"}`, http.StatusTooManyRequests)
		return
	}

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	user, err := h.DB.GetAdminUser()
	if err != nil || user == nil || strings.ToLower(body.Email) != strings.ToLower(user.Email) {
		h.RL.RecordLoginFail(ip)
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)) != nil {
		h.RL.RecordLoginFail(ip)
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	h.RL.ResetLoginFails(ip)

	token, err := middleware.GenerateToken()
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	middleware.SetAuthCookie(w, token)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	middleware.ClearAuthCookie(w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *AuthHandler) HandleResetRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct{ Email string `json:"email"` }
	json.NewDecoder(r.Body).Decode(&body)

	// Always 200 — prevents email enumeration
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})

	user, _ := h.DB.GetAdminUser()
	if user == nil || strings.ToLower(body.Email) != strings.ToLower(user.Email) {
		return
	}

	b := make([]byte, 32)
	rand.Read(b)
	token := hex.EncodeToString(b)

	if err := h.DB.CreateResetToken(token, time.Now().Add(15*time.Minute)); err != nil {
		return
	}

	base := os.Getenv("BASE_URL")
	if base == "" {
		base = "https://oceancoldiron.com"
	}
	resetURL := base + "/manageai?reset=" + token
	go sendResetEmail(user.Email, resetURL)
}

func (h *AuthHandler) HandleResetConfirm(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}
	if len(body.Password) < 8 {
		http.Error(w, `{"error":"password must be at least 8 characters"}`, http.StatusBadRequest)
		return
	}
	ok, err := h.DB.UseResetToken(body.Token)
	if err != nil || !ok {
		http.Error(w, `{"error":"invalid or expired token"}`, http.StatusBadRequest)
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	user, _ := h.DB.GetAdminUser()
	if user == nil {
		http.Error(w, `{"error":"no admin user"}`, http.StatusInternalServerError)
		return
	}
	if err := h.DB.UpsertAdminUser(user.Email, string(hash)); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func sendResetEmail(to, resetURL string) {
	from := os.Getenv("GMAIL_USER")
	pass := os.Getenv("GMAIL_PASS")
	if from == "" || pass == "" {
		return
	}
	auth := smtp.PlainAuth("", from, pass, "smtp.gmail.com")
	body := "To: " + to + "\r\n" +
		"Subject: Portfolio Admin — Password Reset\r\n" +
		"\r\n" +
		"Click the link below to reset your password (expires in 15 minutes):\r\n\r\n" +
		resetURL + "\r\n"
	smtp.SendMail("smtp.gmail.com:587", auth, from, []string{to}, []byte(body))
}

// extractIP is shared across handler files via same package
func extractIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		return strings.Split(ip, ",")[0]
	}
	host, _, err := strings.Cut(r.RemoteAddr, ":")
	if err {
		return host
	}
	return r.RemoteAddr
}
```

- [ ] **Step 2: Verify it compiles**

```bash
go build ./handlers/...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add handlers/auth.go
git commit -m "feat: add auth handlers (login, logout, password reset)"
```

---

### Task 5: RAG stub files

**Files:**
- Create: `rag/career.md`
- Create: `rag/adventures.md`
- Create: `rag/entrepreneurship.md`
- Create: `rag/personal.md`

**Interfaces:**
- Consumes: nothing
- Produces: four markdown files readable by `handlers.loadRAG("./rag")`

- [ ] **Step 1: Create stub RAG files**

Create `rag/career.md`:
```markdown
# Career & Professional Background

## Current Role
Ocean Coldiron (Brandon Coldiron) is an Integration Consultant II at ModMed (2021–present), where he builds Go-based full-stack applications for dynamic protocols and manages 200+ healthcare client integrations via Mirth Connect and AWS. He decreased integration trouble tickets by 87% month-over-month.

## Previous Roles
- **Telecom Engineer, Snap-On Credit (2020–2021):** Managed an Avaya systems upgrade with zero downtime.
- **IT Specialist / Lead DBA, Lakeshore Bone & Joint (2019–2020):** Sole DBA managing 5TB+ of clinical data; collaborated with physicians to optimize EHR workflows.
- **Entrepreneur/CEO, Coldiron Auto Transport & RC Lawn and Tree (2015–2019):** Founded and ran two businesses.
- **Systems Engineer, Cerner Corp (2011–2015):** Executive white-glove support for C-Suite; managed global technical logistics.

## Core Technical Skills
- Go (Golang) — primary language for backend services
- AI / LLM Integrations — building production AI-powered applications
- AWS & Cloud — infrastructure, deployment, S3, EC2
- Mirth Connect / HL7 / FHIR — healthcare data interoperability at scale
- SQL & Database Optimization — query tuning, schema design, 5TB+ datasets
- React, TypeScript — frontend development

## Key Projects
- **EZPostScheduler.com** — Social media AI caption generator and scheduler built with Go, AWS, React, TypeScript, Postgres
- **Healthcare Interop Engine** — HL7 & FHIR data pipelines using Mirth Connect for 200+ clients; reduced trouble tickets 87% MoM
- **Summit Ridge Digital** — Website hosting and building services (S3, AWS, TypeScript)

## Education
- **Colorado State University** — MBA, 2024–2026, GPA 3.9, focus on Business Strategy
- **Indiana University Bloomington** — B.S. Informatics, 2009–2012, Minor in Business, GPA 3.6

## Contact
Email: brcoldir@gmail.com
LinkedIn: linkedin.com/in/brandon-coldiron/
```

Create `rag/adventures.md`:
```markdown
# Adventures & Outdoor Life

## Full-Time RV Living
Ocean has lived and worked full-time from his RV since 2023. He deliberately places himself in unfamiliar places and cultures — often as the outsider in the room — because that is where real learning happens. He manages enterprise-grade remote work from off-grid locations using solar and Starlink.

## High Points Project (Project 50)
Ocean is pursuing the highest point in every U.S. state. As of 2026, he has completed 39 out of 50 state high points. He transitioned to full-time RV life specifically to pursue this goal while continuing to build software remotely.

## Denali 2027
Ocean's primary expedition objective is to summit Denali (20,310 ft), the highest peak in North America, in 2027. This is his long-term mountaineering goal — not a bucket list item, but a practice in discipline, resilience, and long-term thinking.

## Ocean Outdoors (Media Platform)
Ocean runs a YouTube channel called Ocean Outdoors with 100k+ subscribers. The community focuses on outdoor endurance, exploration, and lifestyle design. He also posts on TikTok (@oceansoutdoors), Instagram (@oceansoutdoors), and Facebook (OceansOutdoors).

## Philosophy
Ocean designs his life around growth, discomfort, and perspective. He believes comfort is the enemy of growth. Every challenge he chooses is a system he is trying to understand. Every place he goes makes him better at building the next one.
```

Create `rag/entrepreneurship.md`:
```markdown
# Entrepreneurship Experience

## Coldiron Auto Transport (2015–2019)
Founded and operated an auto transport business. Learned the full cycle of building a service business from zero — sales, operations, customer satisfaction, and P&L management.

## RC Lawn and Tree (2015–2019)
Bootstrapped a lawn and tree service business. Managed staffing, client relationships, and business financials as sole owner/CEO. Learned hard lessons about entrepreneurship firsthand.

## Summit Ridge Digital
A website hosting and building service offering. Helps small businesses establish a professional online presence using AWS S3, TypeScript, and modern web tooling.

## EZPostScheduler.com
An AI-powered social media caption generator and post scheduler. Built end-to-end with Go, AWS, React, TypeScript, and Postgres. Demonstrates Ocean's ability to take a product from idea to production independently.

## Key Lessons
Ocean has lived both the reward and the cost of being an entrepreneur — building from nothing, managing people, handling P&L, learning from failure, and developing the resilience required to keep going. He applies these lessons to his engineering career: shipping products, owning outcomes, and treating systems like businesses that need to run cleanly.
```

Create `rag/personal.md`:
```markdown
# Personal — Who Ocean Is

## What Excites Ocean
- Building systems that are calm, reliable, and elegant under pressure
- AI and LLM integrations — especially RAG, agents, and practical AI in production
- Outdoor endurance — mountaineering, long-distance hiking, physical challenges that require planning and resilience
- Creating content that documents real experience, not performance
- Helping people solve problems they didn't know were solvable
- Designing life intentionally — not defaulting to convention

## Values & Approach
Ocean believes the best systems — technical or personal — are built on clear thinking, honest feedback, and eliminating noise. He approaches both software and life with a systems engineering mindset: find the failure modes, reduce them, and build something that runs without constant intervention.

## Social Links
- YouTube: youtube.com/@oceanoutdoors (100k+ subscribers)
- TikTok: tiktok.com/@oceansoutdoors
- Instagram: instagram.com/oceansoutdoors
- Facebook: facebook.com/OceansOutdoors
- LinkedIn: linkedin.com/in/brandon-coldiron/
- Email: brcoldir@gmail.com

## Location
Ocean is based remotely, currently living full-time in his RV. He travels across the United States pursuing his High Points project while working remotely in systems engineering and AI.

## One-Line Summary
Ocean Coldiron is a systems engineer and AI technologist with 15+ years of experience who lives full-time on the road, has reached the high point of 39/50 U.S. states, and is training for Denali in 2027.
```

- [ ] **Step 2: Verify files exist**

```bash
ls C:\Projects\my-portfolio\rag\
```

Expected: `adventures.md  career.md  entrepreneurship.md  personal.md`

- [ ] **Step 3: Commit**

```bash
git add rag/
git commit -m "feat: add initial RAG knowledge base stub files"
```

---

### Task 6: Chat handler (Claude Haiku)

**Files:**
- Create: `handlers/chat.go`

**Interfaces:**
- Consumes: `db.DB`, `db.Message`, env vars `ANTHROPIC_API_KEY`
- Produces:
  - `handlers.ChatHandler` struct with field `DB *db.DB`
  - `(*ChatHandler).HandleChat(w, r)` — POST /api/chat
  - `handlers.loadRAG(dir string) (string, error)` — internal, shared by voice handlers
  - `handlers.ragAllowlist []string` — internal allowlist

- [ ] **Step 1: Create `handlers/chat.go`**

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
)

type ChatHandler struct {
	DB *db.DB
}

var ragAllowlist = []string{"career.md", "adventures.md", "entrepreneurship.md", "personal.md"}

const (
	maxMessageLen   = 500
	historyLimit    = 20
	maxHistoryChars = 1000
	claudeModel     = "claude-haiku-4-5-20251001"
	maxTokens       = 512
)

type chatRequest struct {
	SessionID string `json:"sessionId"`
	Message   string `json:"message"`
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req chatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.SessionID == "" || req.Message == "" {
		http.Error(w, `{"error":"sessionId and message required"}`, http.StatusBadRequest)
		return
	}
	if len(req.Message) > maxMessageLen {
		http.Error(w, `{"error":"message too long, max 500 characters"}`, http.StatusBadRequest)
		return
	}

	ip := extractIP(r)
	h.DB.EnsureSession(req.SessionID, ip)

	ragContent, _ := loadRAG("./rag")
	history, _ := h.DB.GetRecentMessages(req.SessionID, historyLimit)

	reply, err := callClaude(ragContent, history, req.Message)
	if err != nil {
		http.Error(w, `{"error":"AI unavailable, please try again"}`, http.StatusServiceUnavailable)
		return
	}

	h.DB.SaveMessage(req.SessionID, "user", req.Message)
	h.DB.SaveMessage(req.SessionID, "assistant", reply)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"reply": reply})
}

func loadRAG(dir string) (string, error) {
	var sb strings.Builder
	for _, name := range ragAllowlist {
		data, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			continue
		}
		sb.WriteString("\n\n## ")
		sb.WriteString(strings.TrimSuffix(name, ".md"))
		sb.WriteString("\n")
		sb.Write(data)
	}
	return sb.String(), nil
}

func buildSystemPrompt(ragContent string) string {
	return `You are Ocean Coldiron's personal AI assistant on his portfolio website.
Answer questions about Ocean based ONLY on the information in the knowledge base below.
If the answer is not covered in the knowledge base, respond with: "I don't have that information, but you can reach Ocean directly at brcoldir@gmail.com."
Never guess or invent details. Never discuss compensation, salary, pay rates, or income for any reason.
Keep responses concise (2-4 sentences unless more detail is explicitly requested).

--- KNOWLEDGE BASE ---` + ragContent + `
--- END KNOWLEDGE BASE ---`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func callClaude(ragContent string, history []db.Message, userMessage string) (string, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY not set")
	}

	msgs := make([]claudeMessage, 0, len(history)+1)
	for _, m := range history {
		content := m.Content
		if len(content) > maxHistoryChars {
			content = content[:maxHistoryChars]
		}
		msgs = append(msgs, claudeMessage{Role: m.Role, Content: content})
	}
	msgs = append(msgs, claudeMessage{Role: "user", Content: userMessage})

	payload, _ := json.Marshal(claudeRequest{
		Model:     claudeModel,
		MaxTokens: maxTokens,
		System:    buildSystemPrompt(ragContent),
		Messages:  msgs,
	})

	req, _ := http.NewRequest(http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("anthropic %d: %s", resp.StatusCode, body)
	}

	var cr claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", err
	}
	if len(cr.Content) == 0 {
		return "", fmt.Errorf("empty response from anthropic")
	}
	return cr.Content[0].Text, nil
}
```

- [ ] **Step 2: Verify compile**

```bash
go build ./handlers/...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add handlers/chat.go
git commit -m "feat: add chat handler with Claude Haiku RAG integration"
```

---

### Task 7: Voice handlers (ElevenLabs STT + TTS)

**Files:**
- Modify: `handlers/chat.go` (add two methods to `ChatHandler`)

**Interfaces:**
- Consumes: env vars `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- Produces:
  - `(*ChatHandler).HandleTranscribe(w, r)` — POST /api/chat/transcribe
  - `(*ChatHandler).HandleSpeak(w, r)` — POST /api/chat/speak

- [ ] **Step 1: Add `HandleTranscribe` and `HandleSpeak` to `handlers/chat.go`**

Append to the bottom of `handlers/chat.go`:
```go
func (h *ChatHandler) HandleTranscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey := os.Getenv("ELEVENLABS_API_KEY")
	if apiKey == "" {
		http.Error(w, `{"error":"voice not configured"}`, http.StatusServiceUnavailable)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, `{"error":"audio too large or invalid"}`, http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, `{"error":"audio file required"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile("file", "audio.webm")
	io.Copy(fw, file)
	mw.WriteField("model_id", "scribe_v1")
	mw.Close()

	req, _ := http.NewRequest(http.MethodPost, "https://api.elevenlabs.io/v1/speech-to-text", &buf)
	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, `{"error":"transcription failed"}`, http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	var result struct {
		Text string `json:"text"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"transcript": result.Text})
}

func (h *ChatHandler) HandleSpeak(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Text) == "" {
		http.Error(w, `{"error":"text required"}`, http.StatusBadRequest)
		return
	}
	if len(body.Text) > 5000 {
		body.Text = body.Text[:5000]
	}

	apiKey := os.Getenv("ELEVENLABS_API_KEY")
	voiceID := os.Getenv("ELEVENLABS_VOICE_ID")
	if apiKey == "" || voiceID == "" {
		http.Error(w, `{"error":"voice not configured"}`, http.StatusServiceUnavailable)
		return
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"text":     body.Text,
		"model_id": "eleven_turbo_v2_5",
		"voice_settings": map[string]float64{
			"stability":        0.5,
			"similarity_boost": 0.75,
		},
	})

	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", voiceID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg")

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, `{"error":"TTS failed"}`, http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "audio/mpeg")
	io.Copy(w, resp.Body)
}
```

- [ ] **Step 2: Add missing import `mime/multipart` to `handlers/chat.go`**

Add `"mime/multipart"` to the import block at the top of `handlers/chat.go`. The full import block should be:
```go
import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
)
```

- [ ] **Step 3: Verify compile**

```bash
go build ./handlers/...
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add handlers/chat.go
git commit -m "feat: add ElevenLabs STT transcribe and TTS speak endpoints"
```

---

### Task 8: Admin handlers

**Files:**
- Create: `handlers/admin.go`

**Interfaces:**
- Consumes: `db.DB`, `ragAllowlist` (same package), `loadRAG` func (same package)
- Produces:
  - `handlers.AdminHandler` struct with field `DB *db.DB`
  - `(*AdminHandler).HandleConversations(w, r)` — GET /api/admin/conversations
  - `(*AdminHandler).HandleConversation(w, r)` — GET|DELETE /api/admin/conversations/{id}
  - `(*AdminHandler).HandleRAGList(w, r)` — GET /api/admin/rag
  - `(*AdminHandler).HandleRAGFile(w, r)` — GET|PUT /api/admin/rag/{name}

- [ ] **Step 1: Create `handlers/admin.go`**

```go
package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
)

type AdminHandler struct {
	DB *db.DB
}

func (h *AdminHandler) HandleConversations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessions, err := h.DB.ListSessions()
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}

	if r.URL.Query().Get("format") == "csv" {
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", `attachment; filename="conversations.csv"`)
		cw := csv.NewWriter(w)
		cw.Write([]string{"id", "ip", "message_count", "created_at"})
		for _, s := range sessions {
			cw.Write([]string{s.ID, s.IP, fmt.Sprintf("%d", s.MessageCount), s.CreatedAt.Format("2006-01-02 15:04:05")})
		}
		cw.Flush()
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func (h *AdminHandler) HandleConversation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, `{"error":"id required"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		msgs, err := h.DB.GetSessionMessages(id)
		if err != nil {
			http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(msgs)

	case http.MethodDelete:
		if err := h.DB.DeleteSession(id); err != nil {
			http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *AdminHandler) HandleRAGList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	type ragFile struct {
		Name     string `json:"name"`
		EditedAt string `json:"editedAt"`
	}
	var files []ragFile
	for _, name := range ragAllowlist {
		info, err := os.Stat(filepath.Join("./rag", name))
		if err != nil {
			continue
		}
		files = append(files, ragFile{Name: name, EditedAt: info.ModTime().Format("2006-01-02 15:04:05")})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func (h *AdminHandler) HandleRAGFile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !isAllowedRAG(name) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	path := filepath.Join("./rag", name)

	switch r.Method {
	case http.MethodGet:
		data, err := os.ReadFile(path)
		if err != nil {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"content": string(data)})

	case http.MethodPut:
		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}
		if err := os.WriteFile(path, []byte(body.Content), 0644); err != nil {
			http.Error(w, `{"error":"failed to save"}`, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func isAllowedRAG(name string) bool {
	for _, a := range ragAllowlist {
		if strings.EqualFold(name, a) {
			return true
		}
	}
	return false
}
```

- [ ] **Step 2: Verify compile**

```bash
go build ./handlers/...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add handlers/admin.go
git commit -m "feat: add admin handlers for conversations and RAG file management"
```

---

### Task 9: Refactor main.go

**Files:**
- Modify: `main.go` (full rewrite — preserves contact handler logic, adds all new routes)

**Interfaces:**
- Consumes: all handler packages, middleware packages, db package
- Produces: running server on `$PORT` (default 8080) with all routes registered

- [ ] **Step 1: Rewrite `main.go`**

Replace the entire contents of `main.go` with:
```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"

	"github.com/brandoncoldiron/portfolio/db"
	"github.com/brandoncoldiron/portfolio/handlers"
	"github.com/brandoncoldiron/portfolio/middleware"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Fatal("create data dir:", err)
	}

	database, err := db.Open("./data/portfolio.db")
	if err != nil {
		log.Fatal("open db:", err)
	}
	if err := database.CreateSchema(); err != nil {
		log.Fatal("create schema:", err)
	}
	seedAdminUser(database)

	rl := middleware.NewRateLimiter()

	chatH := &handlers.ChatHandler{DB: database}
	authH := &handlers.AuthHandler{DB: database, RL: rl}
	adminH := &handlers.AdminHandler{DB: database}

	mux := http.NewServeMux()

	// Static files (SPA — serve index.html for unknown paths)
	fs := http.FileServer(http.Dir("./dist"))
	mux.Handle("/", spaHandler(fs))

	// Chat API (rate limited)
	mux.Handle("POST /api/chat", rl.Limit(http.HandlerFunc(chatH.HandleChat)))
	mux.Handle("POST /api/chat/transcribe", rl.Limit(http.HandlerFunc(chatH.HandleTranscribe)))
	mux.Handle("POST /api/chat/speak", rl.Limit(http.HandlerFunc(chatH.HandleSpeak)))

	// Auth API
	mux.HandleFunc("POST /api/auth/login", authH.HandleLogin)
	mux.HandleFunc("POST /api/auth/logout", authH.HandleLogout)
	mux.HandleFunc("POST /api/auth/reset-request", authH.HandleResetRequest)
	mux.HandleFunc("POST /api/auth/reset-confirm", authH.HandleResetConfirm)

	// Admin API (JWT protected)
	mux.Handle("GET /api/admin/conversations", middleware.Protect(http.HandlerFunc(adminH.HandleConversations)))
	mux.Handle("GET /api/admin/conversations/{id}", middleware.Protect(http.HandlerFunc(adminH.HandleConversation)))
	mux.Handle("DELETE /api/admin/conversations/{id}", middleware.Protect(http.HandlerFunc(adminH.HandleConversation)))
	mux.Handle("GET /api/admin/rag", middleware.Protect(http.HandlerFunc(adminH.HandleRAGList)))
	mux.Handle("GET /api/admin/rag/{name}", middleware.Protect(http.HandlerFunc(adminH.HandleRAGFile)))
	mux.Handle("PUT /api/admin/rag/{name}", middleware.Protect(http.HandlerFunc(adminH.HandleRAGFile)))

	// Existing endpoints
	mux.HandleFunc("POST /api/contact", handleContact)
	mux.HandleFunc("GET /api/health", handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// spaHandler serves static files and falls back to index.html for SPA routing
func spaHandler(fs http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			_, err := os.Stat("./dist" + r.URL.Path)
			if os.IsNotExist(err) {
				http.ServeFile(w, r, "./dist/index.html")
				return
			}
		}
		fs.ServeHTTP(w, r)
	})
}

func seedAdminUser(database *db.DB) {
	user, err := database.GetAdminUser()
	if err != nil {
		log.Fatal("check admin user:", err)
	}
	if user != nil {
		return
	}
	initialPass := os.Getenv("ADMIN_INITIAL_PASSWORD")
	if initialPass == "" {
		log.Println("WARNING: No admin user exists. Set ADMIN_INITIAL_PASSWORD env var on first run.")
		return
	}
	email := os.Getenv("ADMIN_EMAIL")
	if email == "" {
		email = "brcoldir@gmail.com"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(initialPass), 12)
	if err != nil {
		log.Fatal("hash admin password:", err)
	}
	if err := database.UpsertAdminUser(email, string(hash)); err != nil {
		log.Fatal("seed admin user:", err)
	}
	log.Printf("Admin user created: %s (remove ADMIN_INITIAL_PASSWORD from env after first login)", email)
}

// ContactRequest and handleContact preserved from original main.go
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	var req ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	senderEmail := os.Getenv("GMAIL_USER")
	senderPassword := os.Getenv("GMAIL_PASS")
	toEmail := "brcoldir@gmail.com"

	if senderEmail != "" && senderPassword != "" {
		auth := smtp.PlainAuth("", senderEmail, senderPassword, "smtp.gmail.com")
		msg := []byte("To: " + toEmail + "\r\nSubject: Portfolio Contact: " + req.Name + "\r\n\r\n" +
			"From: " + req.Name + " (" + req.Email + ")\n\n" + req.Message + "\r\n")
		if err := smtp.SendMail("smtp.gmail.com:587", auth, senderEmail, []string{toEmail}, msg); err != nil {
			log.Printf("Failed to send email: %v", err)
			http.Error(w, "Failed to send email", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Message received"})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
}
```

- [ ] **Step 2: Build the full binary**

```bash
go build -o portfolio-server.exe .
```

Expected: `portfolio-server.exe` created with no errors.

- [ ] **Step 3: Add `ADMIN_INITIAL_PASSWORD` and `BASE_URL` to `.env`**

Add these two lines to `C:\Projects\my-portfolio\.env`:
```
ADMIN_INITIAL_PASSWORD=ChooseAStrongPasswordHere
BASE_URL=https://oceancoldiron.com
```

After first login via the admin UI, remove `ADMIN_INITIAL_PASSWORD` from `.env`.

- [ ] **Step 4: Run all Go tests**

```bash
go test ./...
```

Expected: all tests pass, no compilation errors.

- [ ] **Step 5: Commit**

```bash
git add main.go
git commit -m "feat: refactor main.go — register all routes, add SPA handler, seed admin user"
```

---

### Task 10: ChatWidget React component

**Files:**
- Create: `frontend/src/components/ChatWidget.tsx`
- Modify: `frontend/vite.config.ts` (add dev proxy)

**Interfaces:**
- Consumes: `mode: 'dev' | 'human'` prop; APIs `/api/chat`, `/api/chat/transcribe`, `/api/chat/speak`
- Produces: `ChatWidget` named export

- [ ] **Step 1: Add dev proxy to `vite.config.ts`**

Replace `frontend/vite.config.ts` with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

- [ ] **Step 2: Create `frontend/src/components/ChatWidget.tsx`**

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  mode: 'dev' | 'human';
}

const SESSION_KEY = 'ocean_chat_session_id';
const MAX_LEN = 500;

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const ChatWidget: React.FC<Props> = ({ mode }) => {
  const isDev = mode === 'dev';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Ocean's AI. Ask me anything about his work, adventures, or projects." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionId = useRef(getOrCreateSessionId());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(p => [...p, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, message: trimmed }),
      });
      const data = await res.json();
      const reply: string = res.ok ? data.reply : "Sorry, something went wrong. Try again.";
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
      if (speakerOn && res.ok) void speakText(reply);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Can't connect right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const res = await fetch('/api/chat/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        try {
          const res = await fetch('/api/chat/transcribe', { method: 'POST', body: form });
          if (!res.ok) return;
          const data = await res.json();
          if (data.transcript) await sendMessage(data.transcript);
        } catch {}
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Style tokens
  const panel = isDev ? 'bg-slate-950 border-slate-800' : 'bg-white border-stone-200';
  const header = isDev ? 'bg-slate-900 border-slate-800' : 'bg-stone-50 border-stone-200';
  const inputCls = isDev
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500'
    : 'bg-white border-stone-300 text-stone-800 placeholder-stone-400 focus:border-orange-500';
  const userBubble = isDev ? 'bg-slate-800 text-slate-100' : 'bg-stone-100 text-stone-800';
  const aiBubble = isDev ? 'bg-slate-900 text-slate-300 font-mono text-xs' : 'bg-white border border-stone-200 text-stone-700';
  const btn = isDev ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-500 hover:bg-orange-400';
  const fab = isDev ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20';
  const iconColor = isDev ? 'text-slate-500 hover:text-slate-300' : 'text-stone-400 hover:text-stone-600';
  const accentColor = isDev ? 'text-blue-400' : 'text-orange-500';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className={`w-80 flex flex-col rounded-2xl border shadow-2xl overflow-hidden`}
          style={{ height: '480px' }}>
          <div className={`${panel} flex flex-col h-full`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${header}`}>
              <span className={`font-semibold text-sm ${isDev ? 'text-slate-200 font-mono' : 'text-stone-700'}`}>
                {isDev ? 'Ask Ocean_' : 'Chat with Ocean'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSpeakerOn(s => !s)}
                  className={`p-1 rounded transition-colors ${speakerOn ? accentColor : 'text-slate-500'}`}
                  title={speakerOn ? 'Mute' : 'Enable voice'}>
                  {speakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? userBubble : aiBubble}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2 rounded-xl text-sm ${aiBubble}`}>
                    <span className="animate-pulse">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={`p-3 border-t flex-shrink-0 ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <button onClick={stopRecording}
                    className="p-2 rounded-lg bg-red-500 text-white animate-pulse flex-shrink-0">
                    <MicOff size={15} />
                  </button>
                  <span className={`text-sm ${isDev ? 'text-slate-400' : 'text-stone-500'}`}>Listening…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={startRecording}
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${iconColor}`}>
                    <Mic size={15} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value.slice(0, MAX_LEN))}
                      onKeyDown={onKeyDown}
                      placeholder="Ask me anything…"
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                    />
                    {input.length > 400 && (
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${input.length >= MAX_LEN ? 'text-red-400' : 'text-slate-500'}`}>
                        {input.length}/{MAX_LEN}
                      </span>
                    )}
                  </div>
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                    className={`p-2 rounded-lg text-white transition-colors disabled:opacity-40 flex-shrink-0 ${btn}`}>
                    <Send size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full text-white font-medium text-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${fab}`}>
        {isOpen ? <X size={16} /> : <MessageCircle size={16} />}
        {!isOpen && (isDev ? 'Ask Ocean_' : 'Chat with Ocean')}
      </button>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatWidget.tsx frontend/vite.config.ts
git commit -m "feat: add ChatWidget floating chat component with voice support"
```

---

### Task 11: ManageAI page + App.tsx routing

**Files:**
- Create: `frontend/src/pages/ManageAI.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `mode: 'dev' | 'human'` from App state; APIs `/api/auth/*`, `/api/admin/*`
- Produces: `/manageai` route with login wall, conversations tab, RAG docs tab; `ChatWidget` mounted in all routes

- [ ] **Step 1: Create `frontend/src/pages/ManageAI.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, Tent, LogOut, MessageSquare, FileText, Trash2, ChevronDown, ChevronUp, Download, Save } from 'lucide-react';

interface Props { mode: 'dev' | 'human' }

interface Session { ID: string; IP: string; MessageCount: number; CreatedAt: string }
interface Message { Role: string; Content: string; CreatedAt: string }
interface RAGFile { name: string; editedAt: string }

type Tab = 'conversations' | 'rag';

export default function ManageAI({ mode }: Props) {
  const isDev = mode === 'dev';
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [tab, setTab] = useState<Tab>('conversations');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ragFiles, setRagFiles] = useState<RAGFile[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetch('/api/admin/conversations', { credentials: 'include' })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      if (res.ok) { setAuthed(true); }
      else {
        const d = await res.json();
        setLoginError(d.error || 'Invalid credentials');
      }
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAuthed(false);
  };

  const sendResetEmail = async () => {
    await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail }),
    });
    setResetSent(true);
  };

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/admin/conversations', { credentials: 'include' });
    if (res.ok) setSessions(await res.json());
  }, []);

  const loadRAGFiles = useCallback(async () => {
    const res = await fetch('/api/admin/rag', { credentials: 'include' });
    if (res.ok) setRagFiles(await res.json());
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'conversations') loadSessions();
    else loadRAGFiles();
  }, [authed, tab, loadSessions, loadRAGFiles]);

  const expandSession = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const res = await fetch(`/api/admin/conversations/${id}`, { credentials: 'include' });
    if (res.ok) setMessages(await res.json());
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    await fetch(`/api/admin/conversations/${id}`, { method: 'DELETE', credentials: 'include' });
    setSessions(s => s.filter(x => x.ID !== id));
    if (expanded === id) setExpanded(null);
  };

  const startEdit = async (name: string) => {
    const res = await fetch(`/api/admin/rag/${name}`, { credentials: 'include' });
    if (!res.ok) return;
    const d = await res.json();
    setEditContent(d.content);
    setEditing(name);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/admin/rag/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: editContent }),
    });
    setSaving(false);
    setEditing(null);
    loadRAGFiles();
  };

  // Style tokens
  const bg = isDev ? 'bg-[#0a0f1e] text-slate-100' : 'bg-[#f8f5f2] text-stone-800';
  const card = isDev ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm';
  const inputCls = isDev
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-white border-stone-300 focus:border-orange-500';
  const btnPrimary = isDev ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white';
  const tabActive = isDev ? 'border-blue-500 text-blue-400' : 'border-orange-500 text-orange-600';
  const tabInactive = isDev ? 'border-transparent text-slate-400' : 'border-transparent text-stone-500';

  if (authed === null) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <span className="animate-pulse opacity-50">Loading…</span>
    </div>
  );

  if (!authed) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <div className={`w-full max-w-sm p-8 rounded-2xl border ${card}`}>
        <div className="flex items-center gap-2 mb-8">
          {isDev ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
          <h1 className="text-xl font-bold">Manage AI</h1>
        </div>

        {!showReset ? (
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-50">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none text-sm transition-colors ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-50">Password</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none text-sm transition-colors ${inputCls}`} />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className={`w-full py-3 rounded-lg font-bold transition-all ${btnPrimary} disabled:opacity-50`}>
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setShowReset(true)}
              className="w-full text-center text-sm opacity-50 hover:opacity-70 transition-opacity">
              Forgot password?
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm opacity-70">Enter your email and we'll send a reset link.</p>
            {!resetSent ? (
              <>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-lg border outline-none text-sm ${inputCls}`} />
                <button onClick={sendResetEmail} className={`w-full py-3 rounded-lg font-bold ${btnPrimary}`}>
                  Send Reset Link
                </button>
              </>
            ) : (
              <p className="text-sm text-green-400">Check your email for a reset link (expires in 15 minutes).</p>
            )}
            <button onClick={() => { setShowReset(false); setResetSent(false); }}
              className="w-full text-center text-sm opacity-50 hover:opacity-70">
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b backdrop-blur ${isDev ? 'bg-[#0a0f1e]/90 border-slate-800' : 'bg-white/90 border-stone-200 shadow-sm'}`}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            {isDev ? <Terminal size={18} className="text-blue-500" /> : <Tent size={18} className="text-orange-600" />}
            <span>Manage AI</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className={`flex border-b mb-8 ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
          {(['conversations', 'rag'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? tabActive : tabInactive}`}>
              {t === 'conversations' ? <MessageSquare size={15} /> : <FileText size={15} />}
              {t === 'conversations' ? 'Conversations' : 'RAG Documents'}
            </button>
          ))}
        </div>

        {/* Conversations Tab */}
        {tab === 'conversations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm opacity-50">{sessions.length} conversations</p>
              <a href="/api/admin/conversations?format=csv"
                className="flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity">
                <Download size={14} /> Export CSV
              </a>
            </div>
            <div className="space-y-2">
              {sessions.length === 0 && <p className="text-sm opacity-40 text-center py-12">No conversations yet.</p>}
              {sessions.map(s => (
                <div key={s.ID} className={`rounded-xl border overflow-hidden ${card}`}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="opacity-50 font-mono text-xs">{s.IP}</span>
                      <span className="opacity-70">{s.MessageCount} messages</span>
                      <span className="opacity-40 text-xs">{new Date(s.CreatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => expandSession(s.ID)}
                        className="p-1.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                        {expanded === s.ID ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button onClick={() => deleteSession(s.ID)}
                        className="p-1.5 rounded text-red-400 opacity-50 hover:opacity-100 transition-opacity">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {expanded === s.ID && (
                    <div className={`border-t px-4 py-4 space-y-3 ${isDev ? 'border-slate-800 bg-slate-950' : 'border-stone-100 bg-stone-50'}`}>
                      {messages.map((m, i) => (
                        <div key={i} className={`flex gap-3 text-sm ${m.Role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-lg leading-relaxed ${m.Role === 'user'
                            ? (isDev ? 'bg-slate-700 text-slate-100' : 'bg-stone-200 text-stone-800')
                            : (isDev ? 'bg-slate-900 text-slate-300' : 'bg-white border border-stone-200 text-stone-700')}`}>
                            <span className="block text-xs opacity-40 mb-1 font-mono">{m.Role}</span>
                            {m.Content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RAG Tab */}
        {tab === 'rag' && (
          <div>
            {!editing ? (
              <div className="space-y-3">
                {ragFiles.map(f => (
                  <div key={f.name} className={`flex items-center justify-between px-5 py-4 rounded-xl border ${card}`}>
                    <div>
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs opacity-40 mt-0.5">Last edited: {f.editedAt}</div>
                    </div>
                    <button onClick={() => startEdit(f.name)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${btnPrimary}`}>
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">{editing}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(null)}
                      className="px-4 py-1.5 rounded-lg text-sm opacity-60 hover:opacity-100 transition-opacity">
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={saving}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${btnPrimary} disabled:opacity-50`}>
                      <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className={`w-full h-[60vh] px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-colors resize-none ${inputCls}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount `ChatWidget` and add `/manageai` route in `App.tsx`**

In `frontend/src/App.tsx`, add the `ChatWidget` import and `/manageai` route. Find the import section at the top and add:
```tsx
import { ChatWidget } from './components/ChatWidget'
import ManageAI from './pages/ManageAI'
```

Find the `return (` block inside the `App` component and replace:
```tsx
  return (
    <Routes>
      <Route path="/" element={home} />
      <Route path="/coldiron" element={<Coldiron mode={mode} />} />
    </Routes>
  );
```
with:
```tsx
  return (
    <>
      <Routes>
        <Route path="/" element={home} />
        <Route path="/coldiron" element={<Coldiron mode={mode} />} />
        <Route path="/manageai" element={<ManageAI mode={mode} />} />
      </Routes>
      <Routes>
        <Route path="/" element={<ChatWidget mode={mode} />} />
        <Route path="/coldiron" element={<ChatWidget mode={mode} />} />
      </Routes>
    </>
  );
```

- [ ] **Step 3: Build frontend**

```bash
cd frontend && npm run build
```

Expected: `frontend/dist/` populated with no TypeScript errors.

- [ ] **Step 4: Build full binary**

```bash
cd .. && go build -o portfolio-server.exe .
```

Expected: no errors.

- [ ] **Step 5: Smoke test locally**

```bash
# Terminal 1: start Go server (needs .env loaded)
$env:ANTHROPIC_API_KEY="sk-ant-..."; $env:JWT_SECRET="test-secret-32-chars-minimum-here"; $env:ADMIN_INITIAL_PASSWORD="TestPass123!"; .\portfolio-server.exe

# Terminal 2: start Vite dev server
cd frontend && npm run dev
```

Open `http://localhost:5173` — verify:
- Chat widget appears bottom-right
- Typing a message returns a response about Ocean
- Chat widget changes color when toggling dev/human mode
- Navigate to `http://localhost:5173/manageai` — verify login wall appears
- Log in with `brcoldir@gmail.com` / `TestPass123!` — verify conversations and RAG tabs load

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ManageAI.tsx frontend/src/App.tsx
git commit -m "feat: add ManageAI admin page and mount ChatWidget in App routes"
```

---

## Self-Review

**Spec coverage check:**
- ✅ RAG-grounded chat with Claude Haiku — Task 6
- ✅ No hallucination / no salary discussion — system prompt in Task 6
- ✅ ElevenLabs STT + TTS — Task 7
- ✅ Chat history (last 20 messages) — Task 6 + Task 1 `GetRecentMessages`
- ✅ Rate limiting (20/min, 100/day) — Task 2
- ✅ Max 500 char messages — Task 6
- ✅ SQLite storage — Task 1
- ✅ JWT auth (httpOnly cookie, 24h, HS256) — Task 3
- ✅ bcrypt cost 12 — Task 4 `HandleResetConfirm` + Task 9 `seedAdminUser`
- ✅ Login lockout (5 attempts → 15 min) — Task 2
- ✅ Password reset via email — Task 4
- ✅ `/manageai` login wall — Task 11
- ✅ Conversations list + expand + delete + CSV export — Task 8 + Task 11
- ✅ RAG file list + edit + save — Task 8 + Task 11
- ✅ RAG allowlist (no path traversal) — Task 8 `isAllowedRAG`
- ✅ API keys never in browser — Tasks 6, 7
- ✅ SPA fallback (serves `index.html` for unknown paths) — Task 9 `spaHandler`
- ✅ Dev/human mode styling on ChatWidget — Task 10
- ✅ Session UUIDs in localStorage — Task 10

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:** `db.Message` used consistently across Tasks 1, 6. `ChatHandler`, `AuthHandler`, `AdminHandler` structs match their usage in Task 9. `ragAllowlist` defined in `handlers/chat.go` and referenced in `handlers/admin.go` (same package — valid).

**One gap found and addressed:** `extractIP` defined in `handlers/auth.go` is called in `handlers/chat.go` — both are in package `handlers` so this is valid Go (same package shares unexported identifiers).
