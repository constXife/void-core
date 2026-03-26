package announcements

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

type Announcement struct {
	ID             string     `json:"id"`
	SpaceID        int        `json:"space_id"`
	Priority       string     `json:"priority"`
	Title          string     `json:"title"`
	Body           string     `json:"body"`
	Pinned         bool       `json:"pinned"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	AudienceGroups []string   `json:"audience_groups"`
	CreatedAt      time.Time  `json:"created_at"`
}

type CreateInput struct {
	SpaceID        int        `json:"space_id"`
	Priority       string     `json:"priority"`
	Title          string     `json:"title"`
	Body           string     `json:"body"`
	Pinned         bool       `json:"pinned"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	AudienceGroups []string   `json:"audience_groups"`
}

type UpdateInput struct {
	Title          string     `json:"title"`
	Body           string     `json:"body"`
	Priority       string     `json:"priority"`
	Pinned         bool       `json:"pinned"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	AudienceGroups []string   `json:"audience_groups"`
}

func List(ctx context.Context, db *sql.DB, spaceID int) ([]Announcement, error) {
	if spaceID == 0 {
		return nil, fmt.Errorf("space_id is required")
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, space_id, priority, title, body, pinned, expires_at, audience_groups, created_at
		FROM announcements
		WHERE space_id = $1
		ORDER BY created_at DESC
	`, spaceID)
	if err != nil {
		return nil, fmt.Errorf("list announcements: %w", err)
	}
	defer rows.Close()

	items := make([]Announcement, 0)
	for rows.Next() {
		var item Announcement
		var body sql.NullString
		var expires sql.NullTime
		var audience []byte
		if err := rows.Scan(&item.ID, &item.SpaceID, &item.Priority, &item.Title, &body, &item.Pinned, &expires, &audience, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan announcement: %w", err)
		}
		item.Body = body.String
		if expires.Valid {
			item.ExpiresAt = &expires.Time
		}
		item.AudienceGroups = decodeGroups(audience)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate announcements: %w", err)
	}
	return items, nil
}

func Create(ctx context.Context, db *sql.DB, input CreateInput) (Announcement, error) {
	if input.SpaceID == 0 {
		return Announcement{}, fmt.Errorf("space_id is required")
	}
	if input.Title == "" {
		return Announcement{}, fmt.Errorf("title is required")
	}
	if input.Priority == "" {
		input.Priority = "normal"
	}
	if len(input.AudienceGroups) == 0 {
		input.AudienceGroups = defaultAudienceGroups(ctx, db, input.SpaceID)
	}

	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Announcement{}, fmt.Errorf("encode audience groups: %w", err)
	}

	var item Announcement
	var body sql.NullString
	var expires sql.NullTime
	var audience []byte
	if err := db.QueryRowContext(ctx, `
		INSERT INTO announcements (space_id, priority, title, body, pinned, expires_at, audience_groups)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, space_id, priority, title, body, pinned, expires_at, audience_groups, created_at
	`, input.SpaceID, input.Priority, input.Title, nullableString(input.Body), input.Pinned, input.ExpiresAt, audienceJSON).Scan(
		&item.ID, &item.SpaceID, &item.Priority, &item.Title, &body, &item.Pinned, &expires, &audience, &item.CreatedAt,
	); err != nil {
		return Announcement{}, fmt.Errorf("create announcement: %w", err)
	}
	item.Body = body.String
	if expires.Valid {
		item.ExpiresAt = &expires.Time
	}
	item.AudienceGroups = decodeGroups(audience)
	return item, nil
}

func Update(ctx context.Context, db *sql.DB, id string, input UpdateInput) (Announcement, error) {
	if id == "" {
		return Announcement{}, fmt.Errorf("id is required")
	}
	if input.Title == "" {
		return Announcement{}, fmt.Errorf("title is required")
	}
	if input.Priority == "" {
		input.Priority = "normal"
	}
	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Announcement{}, fmt.Errorf("encode audience groups: %w", err)
	}
	var item Announcement
	var body sql.NullString
	var expires sql.NullTime
	var audience []byte
	if err := db.QueryRowContext(ctx, `
		UPDATE announcements
		SET title = $1,
		    body = $2,
		    priority = $3,
		    pinned = $4,
		    expires_at = $5,
		    audience_groups = $6
		WHERE id = $7
		RETURNING id, space_id, priority, title, body, pinned, expires_at, audience_groups, created_at
	`, input.Title, nullableString(input.Body), input.Priority, input.Pinned, input.ExpiresAt, audienceJSON, id).Scan(
		&item.ID, &item.SpaceID, &item.Priority, &item.Title, &body, &item.Pinned, &expires, &audience, &item.CreatedAt,
	); err != nil {
		return Announcement{}, fmt.Errorf("update announcement: %w", err)
	}
	item.Body = body.String
	if expires.Valid {
		item.ExpiresAt = &expires.Time
	}
	item.AudienceGroups = decodeGroups(audience)
	return item, nil
}

func Delete(ctx context.Context, db *sql.DB, id string) error {
	if id == "" {
		return fmt.Errorf("id is required")
	}
	res, err := db.ExecContext(ctx, `DELETE FROM announcements WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete announcement: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("announcement not found")
	}
	return nil
}

func defaultAudienceGroups(ctx context.Context, db *sql.DB, spaceID int) []string {
	var raw []byte
	if err := db.QueryRowContext(ctx, `SELECT visibility_groups FROM spaces WHERE id = $1`, spaceID).Scan(&raw); err != nil {
		return []string{}
	}
	groups := decodeGroups(raw)
	if len(groups) == 0 {
		return []string{}
	}
	return groups
}

func decodeGroups(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil {
		return []string{}
	}
	return out
}

func nullableString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}
