package notifications

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// Store handles notification persistence
type Store struct {
	db *sql.DB
}

// NewStore creates a new notification store
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Insert creates a new notification or updates existing one if dedup_key matches
func (s *Store) Insert(ctx context.Context, input CreateInput) (Notification, error) {
	if input.Title == "" {
		return Notification{}, fmt.Errorf("title is required")
	}

	if input.Category == "" {
		input.Category = "business"
	}

	actionsJSON, err := json.Marshal(input.Actions)
	if err != nil {
		return Notification{}, fmt.Errorf("marshal actions: %w", err)
	}

	// Handle deduplication - if dedup_key exists, update instead of insert
	if input.DedupKey != "" {
		var existingID string
		err := s.db.QueryRowContext(ctx, `
			SELECT id FROM notifications 
			WHERE dedup_key = $1 AND is_dismissed = false
			LIMIT 1
		`, input.DedupKey).Scan(&existingID)

		if err == nil {
			// Update existing notification
			return s.update(ctx, existingID, input, actionsJSON)
		}
		// If not found, continue with insert
	}

	var notif Notification
	var expiresAt sql.NullTime
	if input.ExpiresAt != nil {
		expiresAt = sql.NullTime{Time: *input.ExpiresAt, Valid: true}
	}

	var dedupKey sql.NullString
	if input.DedupKey != "" {
		dedupKey = sql.NullString{String: input.DedupKey, Valid: true}
	}

	err = s.db.QueryRowContext(ctx, `
		INSERT INTO notifications (
			category, title, message, icon, image_url, service_key,
			actions, callback_url, expires_at, dedup_key
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, category, title, message, icon, image_url, service_key,
		          actions, callback_url, is_read, is_dismissed, created_at, expires_at, dedup_key
	`,
		input.Category, input.Title, input.Message, input.Icon, input.ImageURL,
		input.ServiceKey, actionsJSON, input.CallbackURL, expiresAt, dedupKey,
	).Scan(
		&notif.ID, &notif.Category, &notif.Title, &notif.Message, &notif.Icon,
		&notif.ImageURL, &notif.ServiceKey, &actionsJSON, &notif.CallbackURL,
		&notif.IsRead, &notif.IsDismissed, &notif.CreatedAt, &expiresAt, &dedupKey,
	)
	if err != nil {
		return Notification{}, fmt.Errorf("insert notification: %w", err)
	}

	if expiresAt.Valid {
		notif.ExpiresAt = &expiresAt.Time
	}
	if dedupKey.Valid {
		notif.DedupKey = dedupKey.String
	}

	if err := json.Unmarshal(actionsJSON, &notif.Actions); err != nil {
		notif.Actions = nil
	}

	return notif, nil
}

func (s *Store) update(ctx context.Context, id string, input CreateInput, actionsJSON []byte) (Notification, error) {
	var notif Notification
	var expiresAt sql.NullTime
	if input.ExpiresAt != nil {
		expiresAt = sql.NullTime{Time: *input.ExpiresAt, Valid: true}
	}

	var dedupKey sql.NullString
	if input.DedupKey != "" {
		dedupKey = sql.NullString{String: input.DedupKey, Valid: true}
	}

	err := s.db.QueryRowContext(ctx, `
		UPDATE notifications SET
			title = $2, message = $3, icon = $4, image_url = $5,
			actions = $6, callback_url = $7, expires_at = $8,
			is_read = false, created_at = NOW()
		WHERE id = $1
		RETURNING id, category, title, message, icon, image_url, service_key,
		          actions, callback_url, is_read, is_dismissed, created_at, expires_at, dedup_key
	`,
		id, input.Title, input.Message, input.Icon, input.ImageURL,
		actionsJSON, input.CallbackURL, expiresAt,
	).Scan(
		&notif.ID, &notif.Category, &notif.Title, &notif.Message, &notif.Icon,
		&notif.ImageURL, &notif.ServiceKey, &actionsJSON, &notif.CallbackURL,
		&notif.IsRead, &notif.IsDismissed, &notif.CreatedAt, &expiresAt, &dedupKey,
	)
	if err != nil {
		return Notification{}, fmt.Errorf("update notification: %w", err)
	}

	if expiresAt.Valid {
		notif.ExpiresAt = &expiresAt.Time
	}
	if dedupKey.Valid {
		notif.DedupKey = dedupKey.String
	}

	if err := json.Unmarshal(actionsJSON, &notif.Actions); err != nil {
		notif.Actions = nil
	}

	return notif, nil
}

// List returns recent notifications, optionally filtered by category
func (s *Store) List(ctx context.Context, category string, limit int) ([]Notification, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT id, category, title, message, icon, image_url, service_key,
		       actions, callback_url, is_read, is_dismissed, created_at, expires_at, dedup_key
		FROM notifications
		WHERE is_dismissed = false
		  AND (expires_at IS NULL OR expires_at > NOW())
	`
	args := []any{}

	if category != "" {
		query += " AND category = $1"
		args = append(args, category)
		query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", len(args)+1)
		args = append(args, limit)
	} else {
		query += " ORDER BY created_at DESC LIMIT $1"
		args = append(args, limit)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var notif Notification
		var actionsJSON []byte
		var expiresAt sql.NullTime
		var dedupKey sql.NullString

		err := rows.Scan(
			&notif.ID, &notif.Category, &notif.Title, &notif.Message, &notif.Icon,
			&notif.ImageURL, &notif.ServiceKey, &actionsJSON, &notif.CallbackURL,
			&notif.IsRead, &notif.IsDismissed, &notif.CreatedAt, &expiresAt, &dedupKey,
		)
		if err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}

		if expiresAt.Valid {
			notif.ExpiresAt = &expiresAt.Time
		}
		if dedupKey.Valid {
			notif.DedupKey = dedupKey.String
		}

		if err := json.Unmarshal(actionsJSON, &notif.Actions); err != nil {
			notif.Actions = nil
		}

		notifications = append(notifications, notif)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate notifications: %w", err)
	}

	return notifications, nil
}

// GetByID retrieves a single notification by ID
func (s *Store) GetByID(ctx context.Context, id string) (Notification, error) {
	var notif Notification
	var actionsJSON []byte
	var expiresAt sql.NullTime
	var dedupKey sql.NullString

	err := s.db.QueryRowContext(ctx, `
		SELECT id, category, title, message, icon, image_url, service_key,
		       actions, callback_url, is_read, is_dismissed, created_at, expires_at, dedup_key
		FROM notifications
		WHERE id = $1
	`, id).Scan(
		&notif.ID, &notif.Category, &notif.Title, &notif.Message, &notif.Icon,
		&notif.ImageURL, &notif.ServiceKey, &actionsJSON, &notif.CallbackURL,
		&notif.IsRead, &notif.IsDismissed, &notif.CreatedAt, &expiresAt, &dedupKey,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return Notification{}, fmt.Errorf("notification not found")
		}
		return Notification{}, fmt.Errorf("get notification: %w", err)
	}

	if expiresAt.Valid {
		notif.ExpiresAt = &expiresAt.Time
	}
	if dedupKey.Valid {
		notif.DedupKey = dedupKey.String
	}

	if err := json.Unmarshal(actionsJSON, &notif.Actions); err != nil {
		notif.Actions = nil
	}

	return notif, nil
}

// MarkRead marks a notification as read
func (s *Store) MarkRead(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = true WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("mark read: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// MarkDismissed marks a notification as dismissed
func (s *Store) MarkDismissed(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET is_dismissed = true WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("mark dismissed: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// CleanupExpired removes old dismissed and expired notifications
func (s *Store) CleanupExpired(ctx context.Context) (int64, error) {
	// Delete notifications that are:
	// 1. Dismissed and older than 7 days
	// 2. Expired and older than 1 day
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM notifications
		WHERE (is_dismissed = true AND created_at < NOW() - INTERVAL '7 days')
		   OR (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '1 day')
	`)
	if err != nil {
		return 0, fmt.Errorf("cleanup expired: %w", err)
	}

	return result.RowsAffected()
}

// CountUnread returns the count of unread notifications by category
func (s *Store) CountUnread(ctx context.Context) (map[string]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT category, COUNT(*) 
		FROM notifications
		WHERE is_read = false AND is_dismissed = false
		  AND (expires_at IS NULL OR expires_at > NOW())
		GROUP BY category
	`)
	if err != nil {
		return nil, fmt.Errorf("count unread: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			return nil, fmt.Errorf("scan count: %w", err)
		}
		counts[category] = count
	}

	return counts, rows.Err()
}

// DefaultExpiry returns 24 hours from now
func DefaultExpiry() time.Time {
	return time.Now().Add(24 * time.Hour)
}



