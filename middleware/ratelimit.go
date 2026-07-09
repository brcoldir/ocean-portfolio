package middleware

import (
	"log"
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

// LockoutStore persists login lockout state so it survives server restarts.
type LockoutStore interface {
	SaveLockout(ip string, fails int, lockedUntil time.Time) error
	DeleteLockout(ip string) error
}

// SeedLockout is used to pre-load persisted lockout state on startup.
type SeedLockout struct {
	IP          string
	Fails       int
	LockedUntil time.Time
}

type RateLimiter struct {
	mu         sync.Mutex
	perMinute  map[string]*bucket
	perDay     map[string]*bucket
	loginFails map[string]*loginState
	store      LockoutStore
}

func NewRateLimiter(store LockoutStore, seed []SeedLockout) *RateLimiter {
	rl := &RateLimiter{
		perMinute:  make(map[string]*bucket),
		perDay:     make(map[string]*bucket),
		loginFails: make(map[string]*loginState),
		store:      store,
	}
	now := time.Now()
	for _, s := range seed {
		if s.LockedUntil.IsZero() || now.Before(s.LockedUntil) {
			rl.loginFails[s.IP] = &loginState{
				fails:       s.Fails,
				lockedUntil: s.LockedUntil,
			}
		}
	}
	go rl.sweep()
	return rl
}

func (rl *RateLimiter) sweep() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		now := time.Now()
		for ip, b := range rl.perMinute {
			if now.After(b.resetAt) {
				delete(rl.perMinute, ip)
			}
		}
		for ip, b := range rl.perDay {
			if now.After(b.resetAt) {
				delete(rl.perDay, ip)
			}
		}
		for ip, ls := range rl.loginFails {
			if !ls.lockedUntil.IsZero() && now.After(ls.lockedUntil) {
				delete(rl.loginFails, ip)
				if rl.store != nil {
					if err := rl.store.DeleteLockout(ip); err != nil {
						log.Printf("[ratelimit] failed to delete expired lockout for %s: %v", ip, err)
					}
				}
			}
		}
		rl.mu.Unlock()
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
	ls, ok := rl.loginFails[ip]
	if !ok {
		return true
	}
	if !ls.lockedUntil.IsZero() && !time.Now().Before(ls.lockedUntil) {
		delete(rl.loginFails, ip)
		return true
	}
	if time.Now().Before(ls.lockedUntil) {
		return false
	}
	return ls.fails < 5
}

func (rl *RateLimiter) RecordLoginFail(ip string) {
	rl.mu.Lock()
	ls := rl.loginFails[ip]
	if ls == nil {
		ls = &loginState{}
		rl.loginFails[ip] = ls
	}
	ls.fails++
	if ls.fails >= 5 {
		ls.lockedUntil = time.Now().Add(15 * time.Minute)
	}
	fails, lockedUntil := ls.fails, ls.lockedUntil
	store := rl.store
	rl.mu.Unlock()

	if store != nil {
		if err := store.SaveLockout(ip, fails, lockedUntil); err != nil {
			log.Printf("[ratelimit] failed to persist lockout for %s: %v", ip, err)
		}
	}
}

func (rl *RateLimiter) ResetLoginFails(ip string) {
	rl.mu.Lock()
	delete(rl.loginFails, ip)
	store := rl.store
	rl.mu.Unlock()

	if store != nil {
		if err := store.DeleteLockout(ip); err != nil {
			log.Printf("[ratelimit] failed to clear lockout for %s: %v", ip, err)
		}
	}
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
