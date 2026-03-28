package spaces

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Space struct {
	ID                   int             `json:"id"`
	Title                string          `json:"title"`
	Slug                 string          `json:"slug"`
	Type                 string          `json:"type"`
	ProvisioningState    string          `json:"provisioning_state"`
	ParentID             *int            `json:"parent_id,omitempty"`
	DashboardTemplateID  *int            `json:"dashboard_template_id,omitempty"`
	AccessMode           string          `json:"access_mode"`
	IsDefaultPublicEntry bool            `json:"is_default_public_entry"`
	LayoutMode           string          `json:"layout_mode"`
	BackgroundURL        string          `json:"background_url"`
	IsLockable           bool            `json:"is_lockable"`
	VisibilityGroups     json.RawMessage `json:"visibility_groups"`
	DisplayConfig        json.RawMessage `json:"display_config"`
	PersonalizationRules json.RawMessage `json:"personalization_rules"`
	PublicEntry          json.RawMessage `json:"public_entry"`
	IsProvisioned        bool            `json:"is_provisioned"`
}

type Input struct {
	Title                string          `json:"title"`
	Slug                 string          `json:"slug"`
	Type                 string          `json:"type"`
	ParentID             *int            `json:"parent_id"`
	DashboardTemplateID  *int            `json:"dashboard_template_id"`
	AccessMode           string          `json:"access_mode"`
	IsDefaultPublicEntry *bool           `json:"is_default_public_entry"`
	LayoutMode           string          `json:"layout_mode"`
	BackgroundURL        string          `json:"background_url"`
	IsLockable           *bool           `json:"is_lockable"`
	VisibilityGroups     json.RawMessage `json:"visibility_groups"`
	DisplayConfig        json.RawMessage `json:"display_config"`
	PersonalizationRules json.RawMessage `json:"personalization_rules"`
	PublicEntry          json.RawMessage `json:"public_entry"`
}

func List(ctx context.Context, db *sql.DB) ([]Space, error) {
	return listByProvisioning(ctx, db, true)
}

func ListAll(ctx context.Context, db *sql.DB) ([]Space, error) {
	return listByProvisioning(ctx, db, false)
}

func listByProvisioning(ctx context.Context, db *sql.DB, activeOnly bool) ([]Space, error) {
	query := `
		SELECT id, title, slug, space_type, provisioning_state, parent_id, dashboard_template_id,
		       access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
		       visibility_groups, display_config, personalization_rules, public_entry, is_provisioned
		FROM spaces
	`
	if activeOnly {
		query += " WHERE is_provisioned = true"
	}
	query += " ORDER BY is_provisioned DESC, is_default_public_entry DESC, id"
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list spaces: %w", err)
	}
	defer rows.Close()

	var items []Space
	for rows.Next() {
		var cfg []byte
		var groups []byte
		var rules []byte
		var publicEntry []byte
		var background sql.NullString
		var parentID sql.NullInt64
		var templateID sql.NullInt64
		var item Space
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Slug,
			&item.Type,
			&item.ProvisioningState,
			&parentID,
			&templateID,
			&item.AccessMode,
			&item.IsDefaultPublicEntry,
			&item.LayoutMode,
			&background,
			&item.IsLockable,
			&groups,
			&cfg,
			&rules,
			&publicEntry,
			&item.IsProvisioned,
		); err != nil {
			return nil, fmt.Errorf("scan space: %w", err)
		}
		item.BackgroundURL = background.String
		if item.Type == "" {
			item.Type = "audience"
		}
		item.AccessMode = normalizeAccessMode(item.AccessMode)
		item.DisplayConfig = normalizeJSON(cfg)
		item.VisibilityGroups = normalizeJSON(groups)
		item.PersonalizationRules = normalizeJSON(rules)
		item.PublicEntry = normalizeJSON(publicEntry)
		if parentID.Valid {
			value := int(parentID.Int64)
			item.ParentID = &value
		}
		if templateID.Valid {
			value := int(templateID.Int64)
			item.DashboardTemplateID = &value
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate spaces: %w", err)
	}
	return items, nil
}

func Get(ctx context.Context, db *sql.DB, id int) (Space, error) {
	return getByID(ctx, db, id, true)
}

func GetAny(ctx context.Context, db *sql.DB, id int) (Space, error) {
	return getByID(ctx, db, id, false)
}

func getByID(ctx context.Context, db *sql.DB, id int, activeOnly bool) (Space, error) {
	if id == 0 {
		return Space{}, fmt.Errorf("id is required")
	}
	query := `
		SELECT id, title, slug, space_type, provisioning_state, parent_id, dashboard_template_id,
		       access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
		       visibility_groups, display_config, personalization_rules, public_entry, is_provisioned
		FROM spaces
		WHERE id = $1
	`
	if activeOnly {
		query += " AND is_provisioned = true"
	}
	row := db.QueryRowContext(ctx, query, id)
	return scanSpace(row)
}

func GetBySlug(ctx context.Context, db *sql.DB, slug string) (Space, error) {
	return getBySlug(ctx, db, slug, true)
}

func GetBySlugAny(ctx context.Context, db *sql.DB, slug string) (Space, error) {
	return getBySlug(ctx, db, slug, false)
}

func getBySlug(ctx context.Context, db *sql.DB, slug string, activeOnly bool) (Space, error) {
	if slug == "" {
		return Space{}, fmt.Errorf("slug is required")
	}
	query := `
		SELECT id, title, slug, space_type, provisioning_state, parent_id, dashboard_template_id,
		       access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
		       visibility_groups, display_config, personalization_rules, public_entry, is_provisioned
		FROM spaces
		WHERE slug = $1
	`
	if activeOnly {
		query += " AND is_provisioned = true"
	}
	row := db.QueryRowContext(ctx, query, slug)
	return scanSpace(row)
}

type spaceScanner interface {
	Scan(dest ...any) error
}

func scanSpace(row spaceScanner) (Space, error) {
	var cfg []byte
	var groups []byte
	var rules []byte
	var publicEntry []byte
	var background sql.NullString
	var parentID sql.NullInt64
	var templateID sql.NullInt64
	var item Space
	if err := row.Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.Type,
		&item.ProvisioningState,
		&parentID,
		&templateID,
		&item.AccessMode,
		&item.IsDefaultPublicEntry,
		&item.LayoutMode,
		&background,
		&item.IsLockable,
		&groups,
		&cfg,
		&rules,
		&publicEntry,
		&item.IsProvisioned,
	); err != nil {
		return Space{}, fmt.Errorf("scan space: %w", err)
	}
	item.BackgroundURL = background.String
	if item.Type == "" {
		item.Type = "audience"
	}
	item.AccessMode = normalizeAccessMode(item.AccessMode)
	item.DisplayConfig = normalizeJSON(cfg)
	item.VisibilityGroups = normalizeJSON(groups)
	item.PersonalizationRules = normalizeJSON(rules)
	item.PublicEntry = normalizeJSON(publicEntry)
	if parentID.Valid {
		value := int(parentID.Int64)
		item.ParentID = &value
	}
	if templateID.Valid {
		value := int(templateID.Int64)
		item.DashboardTemplateID = &value
	}
	return item, nil
}

func Create(ctx context.Context, db *sql.DB, input Input) (Space, error) {
	if input.Title == "" || input.Slug == "" {
		return Space{}, fmt.Errorf("title and slug are required")
	}

	if len(input.DisplayConfig) == 0 {
		input.DisplayConfig = json.RawMessage("{}")
	}
	if len(input.VisibilityGroups) == 0 {
		input.VisibilityGroups = json.RawMessage("[]")
	}
	if len(input.PersonalizationRules) == 0 {
		input.PersonalizationRules = json.RawMessage("{}")
	}
	if len(input.PublicEntry) == 0 {
		input.PublicEntry = json.RawMessage("{}")
	}
	isLockable := true
	if input.IsLockable != nil {
		isLockable = *input.IsLockable
	}
	if input.LayoutMode == "" {
		input.LayoutMode = "grid"
	}
	if input.Type == "" {
		input.Type = "audience"
	}
	var isDefaultPublicEntry bool
	input.AccessMode, isDefaultPublicEntry = normalizePublicAccess(input.AccessMode, input.IsDefaultPublicEntry)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Space{}, fmt.Errorf("begin create space tx: %w", err)
	}
	defer tx.Rollback()

	if isDefaultPublicEntry {
		if err := clearDefaultPublicEntries(ctx, tx, 0); err != nil {
			return Space{}, err
		}
	}

	var item Space
	var parentID sql.NullInt64
	var templateID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO spaces (
			title, slug, space_type, parent_id, dashboard_template_id,
			access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
			visibility_groups, display_config, personalization_rules, public_entry
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, title, slug, space_type, parent_id, dashboard_template_id,
		          access_mode, is_default_public_entry, layout_mode, background_url, is_lockable, provisioning_state,
		          visibility_groups, display_config, personalization_rules, public_entry, is_provisioned
	`, input.Title, input.Slug, input.Type, toNullInt(input.ParentID), toNullInt(input.DashboardTemplateID),
		input.AccessMode, isDefaultPublicEntry, input.LayoutMode, input.BackgroundURL, isLockable, input.VisibilityGroups, input.DisplayConfig,
		input.PersonalizationRules, input.PublicEntry).Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.Type,
		&parentID,
		&templateID,
		&item.AccessMode,
		&item.IsDefaultPublicEntry,
		&item.LayoutMode,
		&item.BackgroundURL,
		&item.IsLockable,
		&item.ProvisioningState,
		&item.VisibilityGroups,
		&item.DisplayConfig,
		&item.PersonalizationRules,
		&item.PublicEntry,
		&item.IsProvisioned,
	); err != nil {
		return Space{}, fmt.Errorf("create space: %w", err)
	}
	item.AccessMode = normalizeAccessMode(item.AccessMode)
	if parentID.Valid {
		value := int(parentID.Int64)
		item.ParentID = &value
	}
	if templateID.Valid {
		value := int(templateID.Int64)
		item.DashboardTemplateID = &value
	}
	if err := tx.Commit(); err != nil {
		return Space{}, fmt.Errorf("commit create space tx: %w", err)
	}
	return item, nil
}

func Update(ctx context.Context, db *sql.DB, id int, input Input) (Space, error) {
	if id == 0 {
		return Space{}, fmt.Errorf("id is required")
	}
	if input.Title == "" || input.Slug == "" {
		return Space{}, fmt.Errorf("title and slug are required")
	}
	if len(input.DisplayConfig) == 0 {
		input.DisplayConfig = json.RawMessage("{}")
	}
	if len(input.VisibilityGroups) == 0 {
		input.VisibilityGroups = json.RawMessage("[]")
	}
	if len(input.PersonalizationRules) == 0 {
		input.PersonalizationRules = json.RawMessage("{}")
	}
	if len(input.PublicEntry) == 0 {
		input.PublicEntry = json.RawMessage("{}")
	}
	isLockable := true
	if input.IsLockable != nil {
		isLockable = *input.IsLockable
	}
	if input.LayoutMode == "" {
		input.LayoutMode = "grid"
	}
	if input.Type == "" {
		input.Type = "audience"
	}
	var isDefaultPublicEntry bool
	input.AccessMode, isDefaultPublicEntry = normalizePublicAccess(input.AccessMode, input.IsDefaultPublicEntry)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Space{}, fmt.Errorf("begin update space tx: %w", err)
	}
	defer tx.Rollback()

	if isDefaultPublicEntry {
		if err := clearDefaultPublicEntries(ctx, tx, id); err != nil {
			return Space{}, err
		}
	}

	var item Space
	var parentID sql.NullInt64
	var templateID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `
		UPDATE spaces
		SET title = $1, slug = $2, space_type = $3, parent_id = $4, dashboard_template_id = $5,
		    access_mode = $6, is_default_public_entry = $7,
		    layout_mode = $8, background_url = $9, is_lockable = $10,
		    visibility_groups = $11, display_config = $12, personalization_rules = $13,
		    public_entry = $14
		WHERE id = $15
		RETURNING id, title, slug, space_type, parent_id, dashboard_template_id,
		          access_mode, is_default_public_entry, layout_mode, background_url, is_lockable, provisioning_state,
		          visibility_groups, display_config, personalization_rules, public_entry, is_provisioned
	`, input.Title, input.Slug, input.Type, toNullInt(input.ParentID), toNullInt(input.DashboardTemplateID),
		input.AccessMode, isDefaultPublicEntry, input.LayoutMode, input.BackgroundURL, isLockable, input.VisibilityGroups, input.DisplayConfig,
		input.PersonalizationRules, input.PublicEntry, id).Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.Type,
		&parentID,
		&templateID,
		&item.AccessMode,
		&item.IsDefaultPublicEntry,
		&item.LayoutMode,
		&item.BackgroundURL,
		&item.IsLockable,
		&item.ProvisioningState,
		&item.VisibilityGroups,
		&item.DisplayConfig,
		&item.PersonalizationRules,
		&item.PublicEntry,
		&item.IsProvisioned,
	); err != nil {
		return Space{}, fmt.Errorf("update space: %w", err)
	}
	item.AccessMode = normalizeAccessMode(item.AccessMode)
	if parentID.Valid {
		value := int(parentID.Int64)
		item.ParentID = &value
	}
	if templateID.Valid {
		value := int(templateID.Int64)
		item.DashboardTemplateID = &value
	}
	if err := tx.Commit(); err != nil {
		return Space{}, fmt.Errorf("commit update space tx: %w", err)
	}
	return item, nil
}

func Delete(ctx context.Context, db *sql.DB, id int) error {
	if id == 0 {
		return fmt.Errorf("id is required")
	}
	result, err := db.ExecContext(ctx, `DELETE FROM spaces WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete space: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("space not found")
	}
	return nil
}

func normalizeJSON(value []byte) json.RawMessage {
	if len(value) == 0 {
		return json.RawMessage("{}")
	}
	return json.RawMessage(value)
}

func normalizeAccessMode(value string) string {
	switch value {
	case "public_readonly":
		return value
	default:
		return "private"
	}
}

func normalizePublicAccess(accessMode string, requestedDefault *bool) (string, bool) {
	normalizedMode := normalizeAccessMode(accessMode)
	isDefaultPublicEntry := requestedDefault != nil && *requestedDefault
	if normalizedMode != "public_readonly" {
		isDefaultPublicEntry = false
	}
	return normalizedMode, isDefaultPublicEntry
}

func clearDefaultPublicEntries(ctx context.Context, tx *sql.Tx, keepID int) error {
	query := `
		UPDATE spaces
		SET is_default_public_entry = false
		WHERE is_default_public_entry = true
	`
	args := []any{}
	if keepID > 0 {
		query += " AND id <> $1"
		args = append(args, keepID)
	}
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("clear default public entry: %w", err)
	}
	return nil
}

func toNullInt(value *int) sql.NullInt64 {
	if value == nil || *value == 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*value), Valid: true}
}
