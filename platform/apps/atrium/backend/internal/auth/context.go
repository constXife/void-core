package auth

import (
	"context"
	"strings"
)

type contextKey string

const userKey contextKey = "atrium_user"
const roleOverrideKey contextKey = "atrium_role_override"

func withUser(ctx context.Context, session Session) context.Context {
	return context.WithValue(ctx, userKey, session)
}

func UserFromContext(ctx context.Context) (Session, bool) {
	value, ok := ctx.Value(userKey).(Session)
	return value, ok
}

func IsAdmin(ctx context.Context) bool {
	session, ok := UserFromContext(ctx)
	return ok && session.Role == "admin"
}

func WithRoleOverride(ctx context.Context, role string) context.Context {
	role = strings.TrimSpace(role)
	if role == "" {
		return ctx
	}
	return context.WithValue(ctx, roleOverrideKey, role)
}

func RoleOverrideFromContext(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(roleOverrideKey).(string)
	if !ok || strings.TrimSpace(value) == "" {
		return "", false
	}
	return value, true
}

func EffectiveRole(ctx context.Context, session Session) (string, bool) {
	role := strings.TrimSpace(session.Role)
	if role == "" {
		role = "guest"
	}
	isAdmin := role == "admin"
	if override, ok := RoleOverrideFromContext(ctx); ok && isAdmin {
		role = override
		isAdmin = false
	}
	if role == "" {
		role = "guest"
	}
	return role, isAdmin
}
