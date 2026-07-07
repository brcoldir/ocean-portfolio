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
