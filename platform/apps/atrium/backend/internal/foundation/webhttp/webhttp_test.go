package webhttp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"atrium/internal/foundation/webauth"
)

func TestInstallHealth(t *testing.T) {
	mux := http.NewServeMux()
	InstallHealth(mux)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Fatalf("expected body ok, got %q", rec.Body.String())
	}
}

func TestInstallAuthModes(t *testing.T) {
	mux := http.NewServeMux()
	InstallAuthModes(mux, AuthModes{
		OIDC:     true,
		Local:    true,
		DevLogin: true,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/auth/modes", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]bool
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode auth modes: %v", err)
	}
	if !payload["oidc"] || !payload["local"] || !payload["dev_login"] {
		t.Fatalf("unexpected auth modes payload: %#v", payload)
	}
}

func TestWithOptionalAuthPassesThroughWithoutManager(t *testing.T) {
	called := false
	handler := WithOptionalAuth(nil, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatalf("expected wrapped handler to be called")
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
}

func TestNewSessionPayload(t *testing.T) {
	payload := NewSessionPayload(auth.Session{
		Email:       "admin@example.com",
		Role:        "admin",
		AuthSubject: "subject-1",
		StayID:      "stay-1",
		ExpiresAt:   42,
	})

	if payload.Email != "admin@example.com" {
		t.Fatalf("expected email to be copied")
	}
	if payload.Role != "admin" {
		t.Fatalf("expected role to be copied")
	}
	if payload.AuthSubject != "subject-1" {
		t.Fatalf("expected auth subject to be copied")
	}
	if payload.StayID != "stay-1" {
		t.Fatalf("expected stay id to be copied")
	}
	if payload.ExpiresAt != 42 {
		t.Fatalf("expected expires_at to be copied")
	}
	if len(payload.Permissions) != 0 {
		t.Fatalf("expected empty permissions, got %#v", payload.Permissions)
	}
}

func TestWithOptionalAuthUsesManagerWhenPresent(t *testing.T) {
	manager, err := auth.NewManager(context.Background(), nil, auth.Config{
		LocalEnabled: true,
		CookieSecret: "test-secret",
	})
	if err != nil {
		t.Fatalf("create auth manager: %v", err)
	}

	called := false
	handler := WithOptionalAuth(manager, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatalf("expected wrapped handler to be called")
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
}
