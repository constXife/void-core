package portal

import (
	"context"

	"atrium/internal/auth"
)

func WithRoleOverride(ctx context.Context, role string) context.Context {
	return auth.WithRoleOverride(ctx, role)
}

func roleOverrideFromContext(ctx context.Context) (string, bool) {
	return auth.RoleOverrideFromContext(ctx)
}
