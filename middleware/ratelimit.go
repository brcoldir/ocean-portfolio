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
	rl := &RateLimiter{
		perMinute:  make(map[string]*bucket),
		perDay:     make(map[string]*bucket),
		loginFails: make(map[string]*loginState),
	}
	go rl.sweep()
	return rl
}

func (rl *RateLimiter) sweep() {
	for {
		time.Sleep(time.Hour)
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
