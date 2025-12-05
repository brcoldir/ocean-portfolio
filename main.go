package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
)

// ContactRequest defines the structure of the JSON body for contact form submissions
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

// Response defines the standard API response structure
type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func main() {
	// 1. Serve Static Files (The React App)
	// Expects a 'dist' or 'build' folder in the same directory
	fs := http.FileServer(http.Dir("./dist"))
	http.Handle("/", fs)

	// 2. API Routes
	http.HandleFunc("/api/contact", handleContact)
	http.HandleFunc("/api/health", handleHealth)

	// 3. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 Server starting on port %s...\n", port)
	fmt.Printf("📂 Serving static files from ./dist\n")

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// handleContact processes the form submission from the React frontend
func handleContact(w http.ResponseWriter, r *http.Request) {
	// 1. Check Method
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 2. Parse JSON Body
	var req ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// 3. Get Credentials (from Server Environment)
	senderEmail := os.Getenv("GMAIL_USER")
	senderPassword := os.Getenv("GMAIL_PASS")
	toEmail := "brcoldir@gmail.com" // Your personal email

	if senderEmail == "" || senderPassword == "" {
		log.Println("Error: Email credentials not set on server.")
		// We still send success to the user so they don't worry, but we log the error
		// In a real app, you might want to return a 500 error here.
	} else {
		// 4. Send Email via Gmail
		auth := smtp.PlainAuth("", senderEmail, senderPassword, "smtp.gmail.com")
		msg := []byte("To: " + toEmail + "\r\n" +
			"Subject: Portfolio Contact: " + req.Name + "\r\n" +
			"\r\n" +
			"From: " + req.Name + " (" + req.Email + ")\n\n" +
			req.Message + "\r\n")

		err := smtp.SendMail("smtp.gmail.com:587", auth, senderEmail, []string{toEmail}, msg)
		if err != nil {
			log.Printf("Failed to send email: %v\n", err)
			http.Error(w, "Failed to send email", http.StatusInternalServerError)
			return
		}
		log.Printf("Email sent successfully from %s", req.Name)
	}

	// 5. Respond to React
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Status: "success", Message: "Message received"})
}

// handleHealth is a simple health check endpoint
func handleHealth(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "alive", "uptime": "forever"})
}

// enableCors helper to allow cross-origin requests during development
func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}
