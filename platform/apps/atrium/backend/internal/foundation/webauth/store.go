package auth

import (
	"context"
	"database/sql"
	"fmt"
)

func upsertUser(ctx context.Context, db *sql.DB, email, role string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO users (email, role)
		VALUES ($1, $2)
		ON CONFLICT (email) DO UPDATE SET
			role = EXCLUDED.role
	`, email, role)
	if err != nil {
		return fmt.Errorf("upsert user: %w", err)
	}
	return nil
}

func upsertLocalUser(ctx context.Context, db *sql.DB, email, role, passwordHash string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO users (email, role, password_hash)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE SET
			role = EXCLUDED.role,
			password_hash = EXCLUDED.password_hash
	`, email, role, passwordHash)
	if err != nil {
		return fmt.Errorf("upsert local user: %w", err)
	}
	return nil
}

type userRecord struct {
	Email        string
	Role         string
	PasswordHash sql.NullString
}

func getUserByEmail(ctx context.Context, db *sql.DB, email string) (userRecord, error) {
	var record userRecord
	err := db.QueryRowContext(ctx, `
		SELECT email, role, password_hash
		FROM users
		WHERE email = $1
	`, email).Scan(&record.Email, &record.Role, &record.PasswordHash)
	if err != nil {
		return userRecord{}, err
	}
	return record, nil
}
