package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/brandoncoldiron/portfolio/db"
)

type ChatHandler struct {
	DB *db.DB
}

var anthropicClient = &http.Client{Timeout: 30 * time.Second}

var elevenLabsClient = &http.Client{Timeout: 60 * time.Second}

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

	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

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
	if utf8.RuneCountInString(req.Message) > maxMessageLen {
		http.Error(w, `{"error":"message too long, max 500 characters"}`, http.StatusBadRequest)
		return
	}

	ip := extractIP(r)
	if net.ParseIP(ip) == nil {
		ip = "unknown"
	}
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
	for _, name := range listRAGFiles() {
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
		if utf8.RuneCountInString(content) > maxHistoryChars {
			runes := []rune(content)
			content = string(runes[:maxHistoryChars])
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

	resp, err := anthropicClient.Do(req)
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

	resp, err := elevenLabsClient.Do(req)
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

	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)

	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Text) == "" {
		http.Error(w, `{"error":"text required"}`, http.StatusBadRequest)
		return
	}
	if utf8.RuneCountInString(body.Text) > 500 {
		body.Text = string([]rune(body.Text)[:500])
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

	resp, err := elevenLabsClient.Do(req)
	if err != nil {
		log.Printf("[TTS] ElevenLabs request error: %v", err)
		http.Error(w, `{"error":"TTS failed"}`, http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[TTS] ElevenLabs error status %d", resp.StatusCode)
		http.Error(w, `{"error":"TTS failed"}`, http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	io.Copy(w, resp.Body)
}
