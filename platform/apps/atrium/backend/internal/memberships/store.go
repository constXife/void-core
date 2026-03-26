package memberships

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Membership struct {
	PrincipalID string     `json:"principal_id"`
	Email       string     `json:"email"`
	UserSegment string     `json:"user_segment"`
	SpaceID     int        `json:"space_id"`
	SpaceTitle  string     `json:"space_title"`
	RoleID      int        `json:"role_id"`
	RoleKey     string     `json:"role_key"`
	RoleName    string     `json:"role_name"`
	ValidFrom   *time.Time `json:"valid_from,omitempty"`
	ValidTo     *time.Time `json:"valid_to,omitempty"`
}

type Input struct {
	Email       string     `json:"email"`
	SpaceID     int        `json:"space_id"`
	RoleID      int        `json:"role_id"`
	RoleKey     string     `json:"role_key"`
	UserSegment *string    `json:"user_segment,omitempty"`
	ValidFrom   *time.Time `json:"valid_from,omitempty"`
	ValidTo     *time.Time `json:"valid_to,omitempty"`
}

type ImportInput struct {
	SpaceID   int        `json:"space_id"`
	RoleID    int        `json:"role_id"`
	RoleKey   string     `json:"role_key"`
	Emails    []string   `json:"emails"`
	ValidFrom *time.Time `json:"valid_from,omitempty"`
	ValidTo   *time.Time `json:"valid_to,omitempty"`
}

func List(ctx context.Context, db *sql.DB, spaceID *int) ([]Membership, error) {
	query := `
		SELECT m.principal_id, u.email, u.user_segment, m.space_id, s.title, r.id, r.key, r.name, m.valid_from, m.valid_to
		FROM memberships m
		JOIN users u ON u.id = m.principal_id
		JOIN spaces s ON s.id = m.space_id
		JOIN roles r ON r.id = m.role_id
	`
	args := []any{}
	if spaceID != nil && *spaceID > 0 {
		query += " WHERE m.space_id = $1"
		args = append(args, *spaceID)
	}
	query += " ORDER BY s.id, u.email"

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list memberships: %w", err)
	}
	defer rows.Close()

	items := make([]Membership, 0)
	for rows.Next() {
		var item Membership
		var validFrom sql.NullTime
		var validTo sql.NullTime
		var segment sql.NullString
		if err := rows.Scan(
			&item.PrincipalID,
			&item.Email,
			&segment,
			&item.SpaceID,
			&item.SpaceTitle,
			&item.RoleID,
			&item.RoleKey,
			&item.RoleName,
			&validFrom,
			&validTo,
		); err != nil {
			return nil, fmt.Errorf("scan membership: %w", err)
		}
		if validFrom.Valid {
			item.ValidFrom = &validFrom.Time
		}
		if validTo.Valid {
			item.ValidTo = &validTo.Time
		}
		if segment.Valid {
			item.UserSegment = segment.String
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate memberships: %w", err)
	}
	return items, nil
}

func Upsert(ctx context.Context, db *sql.DB, input Input) (Membership, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" {
		return Membership{}, fmt.Errorf("email is required")
	}
	if input.SpaceID == 0 {
		return Membership{}, fmt.Errorf("space_id is required")
	}
	if input.RoleID == 0 && input.RoleKey == "" {
		return Membership{}, fmt.Errorf("role_id or role_key is required")
	}

	roleID := input.RoleID
	if roleID == 0 {
		if err := db.QueryRowContext(ctx, `SELECT id FROM roles WHERE key = $1`, input.RoleKey).Scan(&roleID); err != nil {
			return Membership{}, fmt.Errorf("role lookup: %w", err)
		}
	}

	var userID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO users (email, role)
		VALUES ($1, 'user')
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		RETURNING id
	`, email).Scan(&userID)
	if err != nil {
		return Membership{}, fmt.Errorf("upsert user: %w", err)
	}
	if input.UserSegment != nil {
		segment := strings.TrimSpace(*input.UserSegment)
		if _, err := db.ExecContext(ctx, `
			UPDATE users
			SET user_segment = $2
			WHERE id = $1
		`, userID, segment); err != nil {
			return Membership{}, fmt.Errorf("update user segment: %w", err)
		}
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO memberships (principal_id, space_id, role_id, valid_from, valid_to)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (principal_id, space_id) DO UPDATE SET
			role_id = EXCLUDED.role_id,
			valid_from = EXCLUDED.valid_from,
			valid_to = EXCLUDED.valid_to
	`, userID, input.SpaceID, roleID, input.ValidFrom, input.ValidTo)
	if err != nil {
		return Membership{}, fmt.Errorf("upsert membership: %w", err)
	}

	spaceID := input.SpaceID
	return loadOne(ctx, db, userID, spaceID)
}

func Delete(ctx context.Context, db *sql.DB, principalID string, spaceID int) error {
	if principalID == "" || spaceID == 0 {
		return fmt.Errorf("principal_id and space_id are required")
	}
	res, err := db.ExecContext(ctx, `
		DELETE FROM memberships
		WHERE principal_id = $1 AND space_id = $2
	`, principalID, spaceID)
	if err != nil {
		return fmt.Errorf("delete membership: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("membership not found")
	}
	return nil
}

func Import(ctx context.Context, db *sql.DB, input ImportInput) (int, error) {
	if input.SpaceID == 0 {
		return 0, fmt.Errorf("space_id is required")
	}
	if input.RoleID == 0 && input.RoleKey == "" {
		return 0, fmt.Errorf("role_id or role_key is required")
	}
	if len(input.Emails) == 0 {
		return 0, fmt.Errorf("emails are required")
	}

	roleID := input.RoleID
	if roleID == 0 {
		if err := db.QueryRowContext(ctx, `SELECT id FROM roles WHERE key = $1`, input.RoleKey).Scan(&roleID); err != nil {
			return 0, fmt.Errorf("role lookup: %w", err)
		}
	}

	unique := map[string]struct{}{}
	for _, email := range input.Emails {
		email = strings.ToLower(strings.TrimSpace(email))
		if email == "" {
			continue
		}
		unique[email] = struct{}{}
	}
	if len(unique) == 0 {
		return 0, fmt.Errorf("emails are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	count := 0
	for email := range unique {
		var userID string
		err := tx.QueryRowContext(ctx, `
			INSERT INTO users (email, role)
			VALUES ($1, 'user')
			ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
			RETURNING id
		`, email).Scan(&userID)
		if err != nil {
			return 0, fmt.Errorf("upsert user: %w", err)
		}
		_, err = tx.ExecContext(ctx, `
			INSERT INTO memberships (principal_id, space_id, role_id, valid_from, valid_to)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (principal_id, space_id) DO UPDATE SET
				role_id = EXCLUDED.role_id,
				valid_from = EXCLUDED.valid_from,
				valid_to = EXCLUDED.valid_to
		`, userID, input.SpaceID, roleID, input.ValidFrom, input.ValidTo)
		if err != nil {
			return 0, fmt.Errorf("upsert membership: %w", err)
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit: %w", err)
	}
	return count, nil
}

func loadOne(ctx context.Context, db *sql.DB, principalID string, spaceID int) (Membership, error) {
	var item Membership
	var validFrom sql.NullTime
	var validTo sql.NullTime
	var segment sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT m.principal_id, u.email, u.user_segment, m.space_id, s.title, r.id, r.key, r.name, m.valid_from, m.valid_to
		FROM memberships m
		JOIN users u ON u.id = m.principal_id
		JOIN spaces s ON s.id = m.space_id
		JOIN roles r ON r.id = m.role_id
		WHERE m.principal_id = $1 AND m.space_id = $2
	`, principalID, spaceID).Scan(
		&item.PrincipalID,
		&item.Email,
		&segment,
		&item.SpaceID,
		&item.SpaceTitle,
		&item.RoleID,
		&item.RoleKey,
		&item.RoleName,
		&validFrom,
		&validTo,
	)
	if err != nil {
		return Membership{}, fmt.Errorf("load membership: %w", err)
	}
	if validFrom.Valid {
		item.ValidFrom = &validFrom.Time
	}
	if validTo.Valid {
		item.ValidTo = &validTo.Time
	}
	if segment.Valid {
		item.UserSegment = segment.String
	}
	return item, nil
}
