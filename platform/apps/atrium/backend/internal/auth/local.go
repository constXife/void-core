package auth

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type localLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Next     string `json:"next"`
}

type localLoginResponse struct {
	RedirectTo string `json:"redirect_to"`
}

func (m *Manager) handleLocalLogin(w http.ResponseWriter, r *http.Request) {
	var input localLoginRequest
	if strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		input.Email = r.FormValue("email")
		input.Password = r.FormValue("password")
		input.Next = r.FormValue("next")
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || input.Password == "" {
		http.Error(w, "missing credentials", http.StatusBadRequest)
		return
	}

	record, err := getUserByEmail(r.Context(), m.db, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "failed to load user", http.StatusInternalServerError)
		return
	}
	if !record.PasswordHash.Valid || record.PasswordHash.String == "" {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(record.PasswordHash.String), []byte(input.Password)); err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	role := m.normalizeRoleValue(record.Role)
	session := Session{
		Email:     record.Email,
		Role:      role,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
	}
	encoded, err := m.encode(session)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     m.cookieName,
		Value:    encoded,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	next := sanitizeNext(input.Next)
	if next == "" {
		next = "/"
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(localLoginResponse{RedirectTo: next})
}

func (m *Manager) EnsureLocalAdmin(ctx context.Context, email, password string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return upsertLocalUser(ctx, m.db, email, "admin", string(hash))
}
