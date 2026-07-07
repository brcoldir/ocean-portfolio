package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct{ *sql.DB }

type Message struct {
	ID        int64
	SessionID string
	Role      string
	Content   string
	CreatedAt time.Time
}

type AdminUser struct {
	Email        string
	PasswordHash string
}

type SessionSummary struct {
	ID           string
	IP           string
	MessageCount int
	CreatedAt    time.Time
}

func Open(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	return &DB{sqlDB}, nil
}

func (d *DB) CreateSchema() error {
	_, err := d.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id         TEXT PRIMARY KEY,
			ip         TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS messages (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
			role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
			content    TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS admin_user (
			id            INTEGER PRIMARY KEY CHECK(id = 1),
			email         TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS reset_tokens (
			token      TEXT PRIMARY KEY,
			expires_at TEXT NOT NULL,
			used       INTEGER DEFAULT 0
		);
	`)
	return err
}

func (d *DB) EnsureSession(id, ip string) error {
	_, err := d.Exec(`INSERT OR IGNORE INTO sessions (id, ip) VALUES (?, ?)`, id, ip)
	return err
}

func (d *DB) SaveMessage(sessionID, role, content string) error {
	_, err := d.Exec(
		`INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)`,
		sessionID, role, content,
	)
	return err
}

func (d *DB) GetRecentMessages(sessionID string, limit int) ([]Message, error) {
	rows, err := d.Query(`
		SELECT id, session_id, role, content, created_at FROM messages
		WHERE session_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
	`, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []Message
	for rows.Next() {
		var m Message
		var createdAt string
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &createdAt); err != nil {
			return nil, err
		}
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		msgs = append(msgs, m)
	}
	// reverse: oldest first
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, rows.Err()
}

func (d *DB) GetAdminUser() (*AdminUser, error) {
	var u AdminUser
	err := d.QueryRow(`SELECT email, password_hash FROM admin_user WHERE id = 1`).
		Scan(&u.Email, &u.PasswordHash)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (d *DB) UpsertAdminUser(email, passwordHash string) error {
	_, err := d.Exec(`
		INSERT INTO admin_user (id, email, password_hash) VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash
	`, email, passwordHash)
	return err
}

func (d *DB) CreateResetToken(token string, expiresAt time.Time) error {
	_, err := d.Exec(
		`INSERT INTO reset_tokens (token, expires_at) VALUES (?, ?)`,
		token, expiresAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (d *DB) UseResetToken(token string) (bool, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := d.Exec(`
		UPDATE reset_tokens SET used = 1
		WHERE token = ? AND used = 0 AND expires_at > ?
	`, token, now)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (d *DB) ListSessions() ([]SessionSummary, error) {
	rows, err := d.Query(`
		SELECT s.id, s.ip, COUNT(m.id), s.created_at
		FROM sessions s LEFT JOIN messages m ON m.session_id = s.id
		GROUP BY s.id ORDER BY s.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SessionSummary
	for rows.Next() {
		var s SessionSummary
		var createdAt string
		if err := rows.Scan(&s.ID, &s.IP, &s.MessageCount, &createdAt); err != nil {
			return nil, err
		}
		s.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		out = append(out, s)
	}
	return out, rows.Err()
}

func (d *DB) GetSessionMessages(sessionID string) ([]Message, error) {
	rows, err := d.Query(`
		SELECT id, session_id, role, content, created_at FROM messages
		WHERE session_id = ? ORDER BY created_at ASC, id ASC
	`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []Message
	for rows.Next() {
		var m Message
		var createdAt string
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &createdAt); err != nil {
			return nil, err
		}
		m.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func (d *DB) DeleteSession(sessionID string) error {
	_, err := d.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}
