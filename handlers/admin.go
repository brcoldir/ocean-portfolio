package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/brandoncoldiron/portfolio/db"
)

type AdminHandler struct {
	DB *db.DB
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
	for _, name := range ragAllowlist {
		info, err := os.Stat(filepath.Join("./rag", name))
		if err != nil {
			continue
		}
		files = append(files, ragFile{Name: name, EditedAt: info.ModTime().Format("2006-01-02 15:04:05")})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func (h *AdminHandler) HandleRAGFile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !isAllowedRAG(name) {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	path := filepath.Join("./rag", name)

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

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func isAllowedRAG(name string) bool {
	for _, a := range ragAllowlist {
		if strings.EqualFold(name, a) {
			return true
		}
	}
	return false
}
