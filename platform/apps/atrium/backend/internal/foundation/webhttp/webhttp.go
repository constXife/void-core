package webhttp

import (
	"encoding/json"
	"net/http"

	"atrium/internal/foundation/webauth"
)

const (
	PathHealth       = "/health"
	PathAuthLogin    = "/auth/login"
	PathAuthCallback = "/auth/callback"
	PathAuthLogout   = "/auth/logout"
	PathAuthDevLogin = "/auth/dev-login"
	PathAuthModes    = "/api/auth/modes"
	PathMe           = "/api/me"
)

type AuthRoutes struct {
	Login    http.HandlerFunc
	Callback http.HandlerFunc
	Logout   http.HandlerFunc
	DevLogin http.HandlerFunc
}

type AuthModes struct {
	OIDC     bool `json:"oidc"`
	Local    bool `json:"local"`
	DevLogin bool `json:"dev_login,omitempty"`
}

type SessionPayload struct {
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	AuthSubject string   `json:"auth_subject,omitempty"`
	Segment     string   `json:"segment,omitempty"`
	StayID      string   `json:"stay_id,omitempty"`
	ExpiresAt   int64    `json:"expires_at"`
	Permissions []string `json:"permissions"`
}

func InstallHealth(mux *http.ServeMux) {
	mux.HandleFunc(PathHealth, HandleHealth)
}

func HandleHealth(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func InstallAuthRoutes(mux *http.ServeMux, routes AuthRoutes) {
	if routes.Login != nil {
		mux.HandleFunc(PathAuthLogin, routes.Login)
	}
	if routes.Callback != nil {
		mux.HandleFunc(PathAuthCallback, routes.Callback)
	}
	if routes.Logout != nil {
		mux.HandleFunc(PathAuthLogout, routes.Logout)
	}
	if routes.DevLogin != nil {
		mux.HandleFunc(PathAuthDevLogin, routes.DevLogin)
	}
}

func InstallAuthModes(mux *http.ServeMux, modes AuthModes) {
	mux.HandleFunc(PathAuthModes, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		WriteJSON(w, modes)
	})
}

func WithOptionalAuth(manager *auth.Manager, next http.Handler) http.Handler {
	if manager == nil {
		return next
	}
	return manager.OptionalMiddleware(next)
}

func WithRequiredAuth(manager *auth.Manager, next http.Handler) http.Handler {
	if manager == nil {
		return next
	}
	return manager.Middleware(next)
}

func NewSessionPayload(session auth.Session) SessionPayload {
	return SessionPayload{
		Email:       session.Email,
		Role:        session.Role,
		AuthSubject: session.AuthSubject,
		StayID:      session.StayID,
		ExpiresAt:   session.ExpiresAt,
		Permissions: []string{},
	}
}

func WriteJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}
