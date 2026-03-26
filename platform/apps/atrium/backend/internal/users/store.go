package users

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func SegmentByEmail(ctx context.Context, db *sql.DB, email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return "", fmt.Errorf("email is required")
	}
	var segment sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT user_segment
		FROM users
		WHERE email = $1
	`, email).Scan(&segment); err != nil {
		return "", err
	}
	if segment.Valid {
		return segment.String, nil
	}
	return "", nil
}

func UpdateSegment(ctx context.Context, db *sql.DB, userID, segment string) error {
	segment = strings.TrimSpace(segment)
	res, err := db.ExecContext(ctx, `
		UPDATE users
		SET user_segment = $2
		WHERE id = $1
	`, userID, segment)
	if err != nil {
		return fmt.Errorf("update user segment: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
