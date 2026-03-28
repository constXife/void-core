package workspace

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"atrium/internal/auth"
)

type SpaceWorkspace struct {
	Spaces []Space `json:"spaces"`
}

type Space struct {
	ID                   string          `json:"id"`
	DatabaseID           int             `json:"database_id"`
	Title                string          `json:"title"`
	AccessMode           string          `json:"access_mode"`
	IsDefaultPublicEntry bool            `json:"is_default_public_entry"`
	BackgroundURL        string          `json:"background_url,omitempty"`
	LayoutMode           string          `json:"layout_mode"`
	IsLockable           bool            `json:"is_lockable"`
	Description          string          `json:"description,omitempty"`
	DisplayConfig        json.RawMessage `json:"display_config"`
	PublicEntry          json.RawMessage `json:"public_entry"`
}

type spaceRow struct {
	ID                   int
	Slug                 string
	Title                string
	AccessMode           string
	IsDefaultPublicEntry bool
	LayoutMode           string
	BackgroundURL        sql.NullString
	IsLockable           bool
	DisplayConfig        []byte
	PublicEntry          []byte
}

func LoadSpaces(ctx context.Context, db *sql.DB) (SpaceWorkspace, error) {
	session, ok := auth.UserFromContext(ctx)
	role := "guest"
	isAdmin := false
	email := ""
	if ok {
		role, isAdmin = auth.EffectiveRole(ctx, session)
		email = session.Email
	}

	var spaceRows []spaceRow
	var err error
	if !ok {
		spaceRows, err = loadPublicSpaceRows(ctx, db)
	} else {
		spaceRows, err = loadSpaceRowsFiltered(ctx, db, email, role, isAdmin)
	}
	if err != nil {
		return SpaceWorkspace{}, err
	}

	spaceByID := make(map[int]Space)
	order := make([]int, 0, len(spaceRows))
	for _, row := range spaceRows {
		layout := row.LayoutMode
		if layout == "" {
			layout = "grid"
		}
		spaceByID[row.ID] = Space{
			ID:                   row.Slug,
			DatabaseID:           row.ID,
			Title:                row.Title,
			AccessMode:           normalizeAccessMode(row.AccessMode),
			IsDefaultPublicEntry: row.IsDefaultPublicEntry,
			BackgroundURL:        row.BackgroundURL.String,
			LayoutMode:           layout,
			IsLockable:           row.IsLockable,
			Description:          parseDescription(row.DisplayConfig),
			DisplayConfig:        normalizeJSON(row.DisplayConfig),
			PublicEntry:          normalizeJSON(row.PublicEntry),
		}
		order = append(order, row.ID)
	}

	var spaces []Space
	for _, id := range order {
		spaces = append(spaces, spaceByID[id])
	}

	spaces = orderSpacesByRole(spaces, role)
	return SpaceWorkspace{Spaces: spaces}, nil
}

func loadPublicSpaceRows(ctx context.Context, db *sql.DB) ([]spaceRow, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, slug, title, access_mode, is_default_public_entry, layout_mode, background_url, is_lockable, display_config, public_entry
		FROM spaces
		WHERE is_provisioned = true AND access_mode = 'public_readonly'
		ORDER BY is_default_public_entry DESC, id
	`)
	if err != nil {
		return nil, fmt.Errorf("query spaces: %w", err)
	}
	defer rows.Close()

	var out []spaceRow
	for rows.Next() {
		var row spaceRow
		if err := rows.Scan(&row.ID, &row.Slug, &row.Title, &row.AccessMode, &row.IsDefaultPublicEntry, &row.LayoutMode, &row.BackgroundURL, &row.IsLockable, &row.DisplayConfig, &row.PublicEntry); err != nil {
			return nil, fmt.Errorf("scan space: %w", err)
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate spaces: %w", err)
	}
	return out, nil
}

func loadSpaceRows(ctx context.Context, db *sql.DB) ([]spaceRow, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, slug, title, access_mode, is_default_public_entry, layout_mode, background_url, is_lockable, display_config, public_entry
		FROM spaces
		WHERE is_provisioned = true
		ORDER BY is_default_public_entry DESC, id
	`)
	if err != nil {
		return nil, fmt.Errorf("query spaces: %w", err)
	}
	defer rows.Close()

	var out []spaceRow
	for rows.Next() {
		var row spaceRow
		if err := rows.Scan(&row.ID, &row.Slug, &row.Title, &row.AccessMode, &row.IsDefaultPublicEntry, &row.LayoutMode, &row.BackgroundURL, &row.IsLockable, &row.DisplayConfig, &row.PublicEntry); err != nil {
			return nil, fmt.Errorf("scan space: %w", err)
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate spaces: %w", err)
	}
	return out, nil
}

func loadSpaceRowsFiltered(ctx context.Context, db *sql.DB, email string, role string, isAdmin bool) ([]spaceRow, error) {
	if isAdmin {
		return loadSpaceRows(ctx, db)
	}
	if role == "" {
		role = "guest"
	}

	var userID sql.NullString
	if email != "" {
		email = strings.ToLower(strings.TrimSpace(email))
		if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&userID); err != nil {
			userID = sql.NullString{}
		}
	}

	rows, err := db.QueryContext(ctx, `
		WITH member_counts AS (
			SELECT space_id, COUNT(*) AS member_count
			FROM memberships
			GROUP BY space_id
		)
		SELECT s.id, s.slug, s.title, s.access_mode, s.is_default_public_entry, s.layout_mode, s.background_url, s.is_lockable,
		       s.display_config, s.public_entry
		FROM spaces s
		LEFT JOIN memberships m ON m.space_id = s.id AND m.principal_id = $1
		LEFT JOIN member_counts mc ON mc.space_id = s.id
		WHERE s.is_provisioned = true AND (
			s.access_mode = 'public_readonly'
			OR (
				(
					jsonb_array_length(s.visibility_groups) = 0
					OR s.visibility_groups ? $2
					OR s.visibility_groups ? '*'
				)
				AND (
					m.principal_id IS NOT NULL
					OR COALESCE(mc.member_count, 0) = 0
				)
			)
		)
		ORDER BY s.is_default_public_entry DESC, s.id
	`, userID, role)
	if err != nil {
		return nil, fmt.Errorf("query spaces: %w", err)
	}
	defer rows.Close()

	var out []spaceRow
	for rows.Next() {
		var row spaceRow
		if err := rows.Scan(&row.ID, &row.Slug, &row.Title, &row.AccessMode, &row.IsDefaultPublicEntry, &row.LayoutMode, &row.BackgroundURL, &row.IsLockable, &row.DisplayConfig, &row.PublicEntry); err != nil {
			return nil, fmt.Errorf("scan space: %w", err)
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate spaces: %w", err)
	}
	return out, nil
}

func parseDescription(raw []byte) string {
	if len(raw) == 0 {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}
	value, ok := payload["description"]
	if !ok {
		return ""
	}
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}

func orderSpacesByRole(spaces []Space, role string) []Space {
	if len(spaces) == 0 {
		return spaces
	}

	role = strings.ToLower(strings.TrimSpace(role))
	if role == "" || role == "guest" {
		return spaces
	}

	if role == "kids" || role == "kid" || role == "child" || role == "children" {
		if kids, ok := findSpaceByID(spaces, "home-kids", "kids"); ok {
			return []Space{kids}
		}
		return spaces
	}

	preferred := []string{"home"}
	if role == "admin" {
		preferred = append(preferred, "home-admin")
	}
	return reorderByPreference(spaces, preferred)
}

func findSpaceByID(spaces []Space, ids ...string) (Space, bool) {
	for _, id := range ids {
		for _, space := range spaces {
			if strings.EqualFold(space.ID, id) {
				return space, true
			}
		}
	}
	return Space{}, false
}

func reorderByPreference(spaces []Space, preferred []string) []Space {
	if len(preferred) == 0 {
		return spaces
	}
	used := make(map[string]struct{}, len(spaces))
	ordered := make([]Space, 0, len(spaces))

	for _, id := range preferred {
		for _, space := range spaces {
			if strings.EqualFold(space.ID, id) {
				if _, ok := used[space.ID]; ok {
					continue
				}
				ordered = append(ordered, space)
				used[space.ID] = struct{}{}
				break
			}
		}
	}

	for _, space := range spaces {
		if _, ok := used[space.ID]; ok {
			continue
		}
		ordered = append(ordered, space)
	}

	return ordered
}

func normalizeJSON(value []byte) json.RawMessage {
	if len(value) == 0 {
		return json.RawMessage("{}")
	}
	return json.RawMessage(value)
}

func normalizeAccessMode(value string) string {
	if strings.TrimSpace(value) == "public_readonly" {
		return "public_readonly"
	}
	return "private"
}
