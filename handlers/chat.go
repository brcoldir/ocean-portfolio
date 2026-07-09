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
	maxTokens       = 350
)

type chatRequest struct {
	SessionID string `json:"sessionId"`
	Message   string `json:"message"`
}

// isAudioMagic checks the first 12 bytes against known audio container magic bytes.
// Accepts WebM/WebA, OGG, MP3, MP4/M4A, and WAV.
func isAudioMagic(b []byte) bool {
	if len(b) < 4 {
		return false
	}
	// WebM / WebA (EBML header)
	if b[0] == 0x1a && b[1] == 0x45 && b[2] == 0xdf && b[3] == 0xa3 {
		return true
	}
	// OGG
	if b[0] == 'O' && b[1] == 'g' && b[2] == 'g' && b[3] == 'S' {
		return true
	}
	// MP3: ID3 tag or sync frame
	if b[0] == 'I' && b[1] == 'D' && b[2] == '3' {
		return true
	}
	if b[0] == 0xff && (b[1]&0xe0 == 0xe0) {
		return true
	}
	// WAV: RIFF....WAVE
	if len(b) >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' &&
		b[8] == 'W' && b[9] == 'A' && b[10] == 'V' && b[11] == 'E' {
		return true
	}
	// MP4 / M4A: ....ftyp at bytes 4-7
	if len(b) >= 8 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p' {
		return true
	}
	return false
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

	// Bind sessions to their originating IP to prevent cross-session snooping.
	storedIP, err := h.DB.GetSessionIP(req.SessionID)
	if err != nil || (storedIP != "" && storedIP != ip) {
		log.Printf("[chat] session IP mismatch for %s: stored=%s current=%s", req.SessionID, storedIP, ip)
		http.Error(w, `{"error":"session invalid"}`, http.StatusForbidden)
		return
	}

	guardrails, _ := loadGuardrails("./rag/guardrails.md")
	ragContent, _ := loadRAG("./rag")
	history, _ := h.DB.GetRecentMessages(req.SessionID, historyLimit)

	reply, err := callClaude(guardrails, ragContent, history, req.Message)
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
		sb.WriteString("\n\n=== ")
		sb.WriteString(strings.ToUpper(strings.TrimSuffix(name, ".md")))
		sb.WriteString(" ===\n")
		sb.WriteString(stripMarkdown(string(data)))
	}
	return sb.String(), nil
}

func stripMarkdown(s string) string {
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		// ## Heading → Heading
		trimmed := strings.TrimLeft(line, "#")
		if len(trimmed) < len(line) {
			line = strings.TrimPrefix(trimmed, " ")
		}
		// - bullet, * bullet, + bullet → plain text
		if len(line) >= 2 && (line[0] == '-' || line[0] == '*' || line[0] == '+') && line[1] == ' ' {
			line = line[2:]
		}
		// **bold** and __bold__ → bold
		line = strings.ReplaceAll(line, "**", "")
		line = strings.ReplaceAll(line, "__", "")
		// `code` → code
		line = strings.ReplaceAll(line, "`", "")
		lines[i] = line
	}
	return strings.Join(lines, "\n")
}

func loadGuardrails(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

type systemBlock struct {
	Type         string        `json:"type"`
	Text         string        `json:"text"`
	CacheControl *cacheControl `json:"cache_control,omitempty"`
}

type cacheControl struct {
	Type string `json:"type"`
}

func buildSystemPrompt(guardrails, ragContent string) []systemBlock {
	// These critical rules appear first so the model sees them before anything else.
	critical := `CRITICAL RULES — no exceptions:
1. Plain text only. Zero markdown. No *, **, #, ##, -bullets, backticks, or any other markdown syntax. Every response must be plain sentences.
2. Maximum 5 sentences. Never write more than 5 sentences regardless of the question.
3. Vague or broad questions (e.g. "tell me about Ocean", "who is he", "what does he do") get exactly ONE short clarifying question back, nothing else.`

	return []systemBlock{
		{Type: "text", Text: critical + "\n\n" + stripMarkdown(guardrails)},
		{Type: "text", Text: "--- KNOWLEDGE BASE ---" + ragContent + "\n--- END KNOWLEDGE BASE ---", CacheControl: &cacheControl{Type: "ephemeral"}},
	}
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeRequest struct {
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	System    []systemBlock `json:"system"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func callClaude(guardrails, ragContent string, history []db.Message, userMessage string) (string, error) {
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
		System:    buildSystemPrompt(guardrails, ragContent),
		Messages:  msgs,
	})

	req, _ := http.NewRequest(http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("anthropic-beta", "prompt-caching-2024-07-31")

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
	return stripMarkdown(cr.Content[0].Text), nil
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

	// Validate audio MIME type by magic bytes before proxying to ElevenLabs.
	magic := make([]byte, 12)
	if _, err := io.ReadFull(file, magic); err != nil {
		http.Error(w, `{"error":"audio file unreadable"}`, http.StatusBadRequest)
		return
	}
	if !isAudioMagic(magic) {
		http.Error(w, `{"error":"unsupported audio format"}`, http.StatusBadRequest)
		return
	}
	// Rewind after reading magic bytes.
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		http.Error(w, `{"error":"audio file unreadable"}`, http.StatusBadRequest)
		return
	}

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
