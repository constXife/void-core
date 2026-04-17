package httpapi

import (
	"context"
	"net/http"
	"strings"

	"atrium/internal/foundation/webauth"
)

func withRoleOverride(ctx context.Context, r *http.Request, session auth.Session) context.Context {
	if session.Role != "admin" {
		return ctx
	}
	role := strings.TrimSpace(r.URL.Query().Get("audience"))
	if role == "" || role == "admin" {
		return ctx
	}
	return auth.WithRoleOverride(ctx, role)
}
