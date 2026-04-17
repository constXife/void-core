package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type Manager struct {
	db            *sql.DB
	provider      *oidc.Provider
	verifier      *oidc.IDTokenVerifier
	oauth2Config  oauth2.Config
	oidcEnabled   bool
	localEnabled  bool
	allowed       map[string]bool
	admins        map[string]bool
	roleMapExact  map[string]string
	roleMapDomain map[string]string
	subjectMap    map[string]string
	defaultRole   string
	guestEnabled  bool
	cookieName    string
	cookieSecret  []byte
	cookieSecure  bool
	cookieDomain  string
	redirectHosts map[string]bool
	callbackPath  string
}

type Config struct {
	Issuer        string
	ClientID      string
	ClientSecret  string
	RedirectURL   string
	LocalEnabled  bool
	CookieSecret  string
	CookieName    string
	AllowedEmails []string
	AdminEmails   []string
	RoleMapExact  map[string]string
	RoleMapDomain map[string]string
	SubjectMap    map[string]string
	DefaultRole   string
	GuestEnabled  bool
	CookieSecure  bool
	CookieDomain  string
	RedirectHosts []string
}

type Session struct {
	Email       string `json:"email"`
	Role        string `json:"role"`
	AuthSubject string `json:"auth_subject,omitempty"`
	StayID      string `json:"stay_id,omitempty"`
	ExpiresAt   int64  `json:"expires_at"`
}

type statePayload struct {
	State     string `json:"state"`
	Nonce     string `json:"nonce"`
	Next      string `json:"next"`
	ExpiresAt int64  `json:"expires_at"`
}

const (
	DefaultSessionCookieName = "atrium_session"
	OIDCStateCookieName      = "atrium_oidc_state"
)

func NewManager(ctx context.Context, db *sql.DB, cfg Config) (*Manager, error) {
	if cfg.CookieSecret == "" {
		return nil, fmt.Errorf("missing cookie secret")
	}
	oidcEnabled := cfg.Issuer != "" && cfg.ClientID != "" && cfg.ClientSecret != "" && cfg.RedirectURL != ""
	if !oidcEnabled && !cfg.LocalEnabled {
		return nil, fmt.Errorf("auth enabled but no provider configured")
	}
	if oidcEnabled && len(cfg.AllowedEmails) == 0 {
		return nil, fmt.Errorf("allowed emails list is empty")
	}
	callbackPath := "/auth/callback"
	if oidcEnabled {
		redirectURL, err := url.Parse(cfg.RedirectURL)
		if err != nil {
			return nil, fmt.Errorf("invalid redirect url: %w", err)
		}
		if strings.TrimSpace(redirectURL.Path) != "" {
			callbackPath = strings.TrimSpace(redirectURL.Path)
		}
	}

	var provider *oidc.Provider
	var verifier *oidc.IDTokenVerifier
	var oauth2Config oauth2.Config
	if oidcEnabled {
		oidcProvider, err := oidc.NewProvider(ctx, cfg.Issuer)
		if err != nil {
			return nil, fmt.Errorf("init oidc provider: %w", err)
		}
		provider = oidcProvider
		verifier = provider.Verifier(&oidc.Config{
			ClientID: cfg.ClientID,
		})
		oauth2Config = oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			Endpoint:     provider.Endpoint(),
			RedirectURL:  cfg.RedirectURL,
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		}
	}

	mgr := &Manager{
		db:            db,
		provider:      provider,
		verifier:      verifier,
		oauth2Config:  oauth2Config,
		oidcEnabled:   oidcEnabled,
		localEnabled:  cfg.LocalEnabled,
		allowed:       toSet(cfg.AllowedEmails),
		admins:        toSet(cfg.AdminEmails),
		roleMapExact:  normalizeRoleMap(cfg.RoleMapExact),
		roleMapDomain: normalizeRoleMap(cfg.RoleMapDomain),
		subjectMap:    normalizeSubjectMap(cfg.SubjectMap),
		defaultRole:   normalizeRole(cfg.DefaultRole, "user"),
		guestEnabled:  cfg.GuestEnabled,
		cookieName:    defaultString(cfg.CookieName, DefaultSessionCookieName),
		cookieSecret:  []byte(cfg.CookieSecret),
		cookieSecure:  cfg.CookieSecure,
		cookieDomain:  strings.TrimSpace(cfg.CookieDomain),
		redirectHosts: toSet(cfg.RedirectHosts),
		callbackPath:  callbackPath,
	}

	return mgr, nil
}

func (m *Manager) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		if !m.localEnabled {
			http.Error(w, "local auth disabled", http.StatusNotFound)
			return
		}
		m.handleLocalLogin(w, r)
		return
	}
	if !m.oidcEnabled {
		http.Error(w, "oidc disabled", http.StatusNotFound)
		return
	}
	state, err := randomString(32)
	if err != nil {
		http.Error(w, "failed to start login", http.StatusInternalServerError)
		return
	}
	nonce, err := randomString(32)
	if err != nil {
		http.Error(w, "failed to start login", http.StatusInternalServerError)
		return
	}

	next := SanitizeNext(r.URL.Query().Get("next"))
	payload := statePayload{
		State:     state,
		Nonce:     nonce,
		Next:      next,
		ExpiresAt: time.Now().Add(10 * time.Minute).Unix(),
	}
	encoded, err := m.encode(payload)
	if err != nil {
		http.Error(w, "failed to start login", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     OIDCStateCookieName,
		Value:    encoded,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	oauth2Config := m.oauth2ConfigForRequest(r)
	http.Redirect(w, r, oauth2Config.AuthCodeURL(state, oidc.Nonce(nonce)), http.StatusFound)
}

func (m *Manager) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	if !m.oidcEnabled {
		http.Error(w, "oidc disabled", http.StatusNotFound)
		return
	}
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	if state == "" || code == "" {
		http.Error(w, "missing state or code", http.StatusBadRequest)
		return
	}

	stateCookie, err := r.Cookie(OIDCStateCookieName)
	if err != nil {
		http.Error(w, "missing login state", http.StatusBadRequest)
		return
	}

	var payload statePayload
	if err := m.decode(stateCookie.Value, &payload); err != nil {
		http.Error(w, "invalid login state", http.StatusBadRequest)
		return
	}
	if payload.State != state || payload.ExpiresAt < time.Now().Unix() {
		http.Error(w, "login state expired", http.StatusBadRequest)
		return
	}

	oauth2Config := m.oauth2ConfigForRequest(r)
	token, err := oauth2Config.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "token exchange failed", http.StatusBadRequest)
		return
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "missing id_token", http.StatusBadRequest)
		return
	}

	idToken, err := m.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		http.Error(w, "invalid id_token", http.StatusUnauthorized)
		return
	}
	if idToken.Nonce != payload.Nonce {
		http.Error(w, "invalid nonce", http.StatusUnauthorized)
		return
	}

	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}
	if err := idToken.Claims(&claims); err != nil {
		http.Error(w, "invalid token claims", http.StatusBadRequest)
		return
	}

	email := strings.ToLower(strings.TrimSpace(claims.Email))
	if email == "" {
		if userEmail, err := m.emailFromUserInfo(r.Context(), token); err == nil {
			email = strings.ToLower(strings.TrimSpace(userEmail))
		}
	}

	if email == "" {
		http.Error(w, "email not found", http.StatusUnauthorized)
		return
	}
	if !claims.EmailVerified && claims.Email != "" {
		http.Error(w, "email not verified", http.StatusUnauthorized)
		return
	}
	if !m.allowed[email] {
		http.Error(w, "email not allowed", http.StatusForbidden)
		return
	}

	role := m.roleForEmail(email)
	if err := upsertUser(r.Context(), m.db, email, role); err != nil {
		http.Error(w, "failed to provision user", http.StatusInternalServerError)
		return
	}

	session := Session{
		Email:       email,
		Role:        role,
		AuthSubject: m.authSubjectForEmail(email),
		ExpiresAt:   time.Now().Add(24 * time.Hour).Unix(),
	}
	encoded, err := m.encode(session)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     m.cookieName,
		Value:    encoded,
		Domain:   m.cookieDomain,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "atrium_oidc_state",
		Value:    "",
		Domain:   m.cookieDomain,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.cookieSecure,
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})

	redirectTo := payload.Next
	if redirectTo == "" {
		redirectTo = "/"
	}
	http.Redirect(w, r, redirectTo, http.StatusFound)
}

func (m *Manager) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     m.cookieName,
		Value:    "",
		Domain:   m.cookieDomain,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.cookieSecure,
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (m *Manager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.sessionFromRequest(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := withUser(r.Context(), session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *Manager) OptionalMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.sessionFromRequest(r)
		if err == nil {
			ctx := withUser(r.Context(), session)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (m *Manager) sessionFromRequest(r *http.Request) (Session, error) {
	cookie, err := r.Cookie(m.cookieName)
	if err != nil {
		return Session{}, err
	}

	var session Session
	if err := m.decode(cookie.Value, &session); err != nil {
		return Session{}, err
	}
	if session.ExpiresAt < time.Now().Unix() {
		return Session{}, errors.New("session expired")
	}
	return session, nil
}

func (m *Manager) roleForEmail(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	if m.admins[email] {
		return "admin"
	}
	if role, ok := m.roleMapExact[email]; ok {
		return m.normalizeRoleValue(role)
	}
	parts := strings.Split(email, "@")
	if len(parts) == 2 {
		if role, ok := m.roleMapDomain[parts[1]]; ok {
			return m.normalizeRoleValue(role)
		}
	}
	return m.normalizeRoleValue(m.defaultRole)
}

func (m *Manager) authSubjectForEmail(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return ""
	}
	return strings.TrimSpace(m.subjectMap[email])
}

func (m *Manager) normalizeRoleValue(role string) string {
	role = normalizeRole(role, "user")
	if role == "guest" && !m.guestEnabled {
		return "user"
	}
	return role
}

func (m *Manager) emailFromUserInfo(ctx context.Context, token *oauth2.Token) (string, error) {
	userInfo, err := m.provider.UserInfo(ctx, oauth2.StaticTokenSource(token))
	if err != nil {
		return "", err
	}
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}
	if err := userInfo.Claims(&claims); err != nil {
		return "", err
	}
	if claims.Email == "" || !claims.EmailVerified {
		return "", fmt.Errorf("email not verified")
	}
	return claims.Email, nil
}

func (m *Manager) encode(value any) (string, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(raw)
	signature := sign(encoded, m.cookieSecret)
	return encoded + "." + signature, nil
}

func (m *Manager) decode(value string, out any) error {
	parts := strings.Split(value, ".")
	if len(parts) != 2 {
		return errors.New("invalid token format")
	}

	expected := sign(parts[0], m.cookieSecret)
	if !hmac.Equal([]byte(parts[1]), []byte(expected)) {
		return errors.New("invalid token signature")
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, out)
}

func sign(value string, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func randomString(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func toSet(list []string) map[string]bool {
	result := make(map[string]bool, len(list))
	for _, item := range list {
		item = strings.ToLower(strings.TrimSpace(item))
		if item == "" {
			continue
		}
		result[item] = true
	}
	return result
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func normalizeRoleMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	result := make(map[string]string, len(input))
	for key, value := range input {
		k := strings.ToLower(strings.TrimSpace(key))
		v := strings.ToLower(strings.TrimSpace(value))
		if k == "" || v == "" {
			continue
		}
		result[k] = v
	}
	return result
}

func normalizeSubjectMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	result := make(map[string]string, len(input))
	for key, value := range input {
		k := strings.ToLower(strings.TrimSpace(key))
		v := strings.TrimSpace(value)
		if k == "" || v == "" {
			continue
		}
		result[k] = v
	}
	return result
}

func normalizeRole(value, fallback string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return fallback
	}
	return value
}

func (m *Manager) LocalEnabled() bool {
	return m.localEnabled
}

func (m *Manager) OIDCEnabled() bool {
	return m.oidcEnabled
}

func (m *Manager) EncodeForTests(value any) (string, error) {
	return m.encode(value)
}

func SanitizeNext(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if !strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") {
		return ""
	}
	if strings.Contains(value, "://") || strings.Contains(value, "\\") {
		return ""
	}
	return value
}

func (m *Manager) oauth2ConfigForRequest(r *http.Request) oauth2.Config {
	if !m.oidcEnabled {
		return m.oauth2Config
	}
	config := m.oauth2Config
	if callbackURL := m.callbackURLForRequest(r); callbackURL != "" {
		config.RedirectURL = callbackURL
	}
	return config
}

func (m *Manager) callbackURLForRequest(r *http.Request) string {
	if !m.oidcEnabled {
		return ""
	}
	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(r.Host)
	}
	host = strings.ToLower(strings.TrimSpace(strings.Split(host, ",")[0]))
	if host == "" {
		return m.oauth2Config.RedirectURL
	}
	if len(m.redirectHosts) > 0 && !m.redirectHosts[host] {
		return m.oauth2Config.RedirectURL
	}
	scheme := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if scheme == "" {
		if r.TLS != nil {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}
	return (&url.URL{
		Scheme: scheme,
		Host:   host,
		Path:   m.callbackPath,
	}).String()
}
