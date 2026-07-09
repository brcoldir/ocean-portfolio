package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
	"github.com/brandoncoldiron/portfolio/handlers"
	"github.com/brandoncoldiron/portfolio/middleware"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	jwtSecret := os.Getenv("JWT_SECRET")
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be set to at least 32 characters")
	}

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
	mux.Handle("POST /api/auth/reset-request", rl.Limit(http.HandlerFunc(authH.HandleResetRequest)))
	mux.HandleFunc("POST /api/auth/reset-confirm", authH.HandleResetConfirm)

	// Admin API (JWT protected)
	mux.Handle("GET /api/admin/conversations", middleware.Protect(http.HandlerFunc(adminH.HandleConversations)))
	mux.Handle("GET /api/admin/conversations/{id}", middleware.Protect(http.HandlerFunc(adminH.HandleConversation)))
	mux.Handle("DELETE /api/admin/conversations/{id}", middleware.Protect(http.HandlerFunc(adminH.HandleConversation)))
	mux.Handle("GET /api/admin/rag", middleware.Protect(http.HandlerFunc(adminH.HandleRAGList)))
	mux.Handle("POST /api/admin/rag", middleware.Protect(http.HandlerFunc(adminH.HandleRAGCreate)))
	mux.Handle("GET /api/admin/rag/{name}", middleware.Protect(http.HandlerFunc(adminH.HandleRAGFile)))
	mux.Handle("PUT /api/admin/rag/{name}", middleware.Protect(http.HandlerFunc(adminH.HandleRAGFile)))
	mux.Handle("DELETE /api/admin/rag/{name}", middleware.Protect(http.HandlerFunc(adminH.HandleRAGFile)))

	// Existing endpoints
	mux.Handle("POST /api/contact", rl.Limit(http.HandlerFunc(handleContact)))
	mux.HandleFunc("GET /api/health", handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, secureHeaders(mux)))
}

func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self'; font-src 'self'")
		next.ServeHTTP(w, r)
	})
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

// sanitizeHeader strips CR/LF characters to prevent email header injection.
func sanitizeHeader(s string) string {
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "")
	return strings.TrimSpace(s)
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	var req ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	name := sanitizeHeader(req.Name)
	email := sanitizeHeader(req.Email)
	message := strings.TrimSpace(req.Message)

	if name == "" || email == "" || message == "" {
		http.Error(w, "name, email, and message are required", http.StatusBadRequest)
		return
	}
	if len(name) > 200 || len(email) > 200 || len(message) > 5000 {
		http.Error(w, "input too long", http.StatusBadRequest)
		return
	}

	senderEmail := os.Getenv("GMAIL_USER")
	senderPassword := os.Getenv("GMAIL_PASS")
	toEmail := "brcoldir@gmail.com"

	if senderEmail != "" && senderPassword != "" {
		auth := smtp.PlainAuth("", senderEmail, senderPassword, "smtp.gmail.com")
		msg := []byte("To: " + toEmail + "\r\nSubject: Portfolio Contact: " + name + "\r\n\r\n" +
			"From: " + name + " (" + email + ")\r\n\r\n" + message + "\r\n")
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
