package db_test

import (
	"os"
	"testing"
	"time"

	"github.com/brandoncoldiron/portfolio/db"
)

func setupDB(t *testing.T) *db.DB {
	t.Helper()
	f, err := os.CreateTemp("", "portfolio-test-*.db")
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	t.Cleanup(func() { os.Remove(f.Name()) })

	database, err := db.Open(f.Name())
	if err != nil {
		t.Fatal(err)
	}
	if err := database.CreateSchema(); err != nil {
		t.Fatal(err)
	}
	return database
}

func TestEnsureSession(t *testing.T) {
	d := setupDB(t)
	if err := d.EnsureSession("sess-1", "1.2.3.4"); err != nil {
		t.Fatal(err)
	}
	// idempotent
	if err := d.EnsureSession("sess-1", "1.2.3.4"); err != nil {
		t.Fatal(err)
	}
}

func TestSaveAndGetMessages(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("sess-1", "1.2.3.4")
	d.SaveMessage("sess-1", "user", "hello")
	d.SaveMessage("sess-1", "assistant", "hi there")

	msgs, err := d.GetRecentMessages("sess-1", 20)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].Role != "user" {
		t.Errorf("expected first message role=user, got %s", msgs[0].Role)
	}
}

func TestGetRecentMessages_Limit(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("sess-1", "1.2.3.4")
	for i := 0; i < 25; i++ {
		d.SaveMessage("sess-1", "user", "msg")
	}
	msgs, err := d.GetRecentMessages("sess-1", 20)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 20 {
		t.Fatalf("expected 20 messages (limit), got %d", len(msgs))
	}
}

func TestAdminUser(t *testing.T) {
	d := setupDB(t)
	user, err := d.GetAdminUser()
	if err != nil {
		t.Fatal(err)
	}
	if user != nil {
		t.Fatal("expected no user initially")
	}

	if err := d.UpsertAdminUser("admin@test.com", "hash123"); err != nil {
		t.Fatal(err)
	}
	user, err = d.GetAdminUser()
	if err != nil || user == nil {
		t.Fatal("expected user after upsert")
	}
	if user.Email != "admin@test.com" {
		t.Errorf("expected email admin@test.com, got %s", user.Email)
	}
}

func TestResetToken(t *testing.T) {
	d := setupDB(t)
	expires := time.Now().Add(15 * time.Minute)
	if err := d.CreateResetToken("tok123", expires); err != nil {
		t.Fatal(err)
	}
	ok, err := d.UseResetToken("tok123")
	if err != nil || !ok {
		t.Fatal("expected token to be valid")
	}
	// token is single-use
	ok, err = d.UseResetToken("tok123")
	if err != nil || ok {
		t.Fatal("expected token to be consumed")
	}
}

func TestResetToken_Expired(t *testing.T) {
	d := setupDB(t)
	d.CreateResetToken("expired", time.Now().Add(-1*time.Minute))
	ok, err := d.UseResetToken("expired")
	if err != nil || ok {
		t.Fatal("expected expired token to fail")
	}
}

func TestListAndDeleteSessions(t *testing.T) {
	d := setupDB(t)
	d.EnsureSession("s1", "1.1.1.1")
	d.EnsureSession("s2", "2.2.2.2")
	d.SaveMessage("s1", "user", "hello")

	sessions, err := d.ListSessions()
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}

	if err := d.DeleteSession("s1"); err != nil {
		t.Fatal(err)
	}
	sessions, _ = d.ListSessions()
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session after delete, got %d", len(sessions))
	}
}
