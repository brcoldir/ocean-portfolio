package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net"
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
	var body struct {
		Email string `json:"email"`
	}
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

// extractIP extracts the client IP from the request, respecting X-Forwarded-For
// for reverse-proxy deployments. Shared across handler files via same package.
func extractIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
