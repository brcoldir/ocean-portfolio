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
