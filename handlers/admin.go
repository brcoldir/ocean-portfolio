package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
)

type AdminHandler struct {
	DB *db.DB
}

var ragNameRe = regexp.MustCompile(`^[a-z0-9_-]+\.md$`)

// listRAGFiles returns all .md filenames in ./rag, in directory order.
func listRAGFiles() []string {
	entries, err := os.ReadDir("./rag")
	if err != nil {
		return nil
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".md") {
			names = append(names, e.Name())
		}
	}
	return names
}

// canonicalRAGName returns the real filename for name (case-insensitive match), or ("", false).
func canonicalRAGName(name string) (string, bool) {
	for _, f := range listRAGFiles() {
		if strings.EqualFold(name, f) {
			return f, true
		}
	}
	return "", false
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
	for _, name := range listRAGFiles() {
		info, err := os.Stat(filepath.Join("./rag", name))
		if err != nil {
			continue
		}
		files = append(files, ragFile{Name: name, EditedAt: info.ModTime().Format("2006-01-02 15:04:05")})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func (h *AdminHandler) HandleRAGCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	name := strings.ToLower(strings.TrimSpace(body.Name))
	if !strings.HasSuffix(name, ".md") {
		name += ".md"
	}
	if !ragNameRe.MatchString(name) || len(name) > 64 {
		http.Error(w, `{"error":"invalid filename — use lowercase letters, numbers, hyphens, underscores"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join("./rag", name)
	if _, err := os.Stat(path); err == nil {
		http.Error(w, `{"error":"file already exists"}`, http.StatusConflict)
		return
	}

	if err := os.WriteFile(path, []byte(body.Content), 0644); err != nil {
		http.Error(w, `{"error":"failed to create"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *AdminHandler) HandleRAGFile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	canonical, ok := canonicalRAGName(name)
	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	path := filepath.Join("./rag", canonical)

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

	case http.MethodDelete:
		if err := os.Remove(path); err != nil {
			http.Error(w, `{"error":"failed to delete"}`, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
