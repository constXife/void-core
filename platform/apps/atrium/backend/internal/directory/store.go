package directory

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

type Item struct {
	ID             string          `json:"id"`
	SpaceID        int             `json:"space_id"`
	Type           string          `json:"type"`
	Key            string          `json:"key"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	IconURL        string          `json:"icon_url"`
	URL            string          `json:"url"`
	Pinned         bool            `json:"pinned"`
	Tags           []string        `json:"tags"`
	ActionKeys     []string        `json:"action_keys"`
	AudienceGroups []string        `json:"audience_groups"`
	ServiceType    string          `json:"service_type,omitempty"`
	Owners         json.RawMessage `json:"owners,omitempty"`
	Links          json.RawMessage `json:"links,omitempty"`
	Endpoints      json.RawMessage `json:"endpoints,omitempty"`
	Tier           string          `json:"tier,omitempty"`
	Lifecycle      string          `json:"lifecycle,omitempty"`
	AccessPath     string          `json:"access_path,omitempty"`
	RunbookURL     string          `json:"runbook_url,omitempty"`
	Classification string          `json:"classification,omitempty"`
	DependsOn      json.RawMessage `json:"depends_on,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type CreateInput struct {
	SpaceID        int             `json:"space_id"`
	Type           string          `json:"type"`
	Key            string          `json:"key"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	IconURL        string          `json:"icon_url"`
	URL            string          `json:"url"`
	Pinned         bool            `json:"pinned"`
	Tags           []string        `json:"tags"`
	ActionKeys     []string        `json:"action_keys"`
	AudienceGroups []string        `json:"audience_groups"`
	ServiceType    string          `json:"service_type"`
	Owners         json.RawMessage `json:"owners"`
	Links          json.RawMessage `json:"links"`
	Endpoints      json.RawMessage `json:"endpoints"`
	Tier           string          `json:"tier"`
	Lifecycle      string          `json:"lifecycle"`
	AccessPath     string          `json:"access_path"`
	RunbookURL     string          `json:"runbook_url"`
	Classification string          `json:"classification"`
	DependsOn      json.RawMessage `json:"depends_on"`
}

type UpdateInput struct {
	Type           string          `json:"type"`
	Key            string          `json:"key"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	IconURL        string          `json:"icon_url"`
	URL            string          `json:"url"`
	Pinned         bool            `json:"pinned"`
	Tags           []string        `json:"tags"`
	ActionKeys     []string        `json:"action_keys"`
	AudienceGroups []string        `json:"audience_groups"`
	ServiceType    string          `json:"service_type"`
	Owners         json.RawMessage `json:"owners"`
	Links          json.RawMessage `json:"links"`
	Endpoints      json.RawMessage `json:"endpoints"`
	Tier           string          `json:"tier"`
	Lifecycle      string          `json:"lifecycle"`
	AccessPath     string          `json:"access_path"`
	RunbookURL     string          `json:"runbook_url"`
	Classification string          `json:"classification"`
	DependsOn      json.RawMessage `json:"depends_on"`
}

func List(ctx context.Context, db *sql.DB, spaceID int) ([]Item, error) {
	if spaceID == 0 {
		return nil, fmt.Errorf("space_id is required")
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
		       service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
		       classification, depends_on_json, created_at
		FROM directory_items
		WHERE space_id = $1
		ORDER BY created_at DESC
	`, spaceID)
	if err != nil {
		return nil, fmt.Errorf("list directory: %w", err)
	}
	defer rows.Close()

	items := make([]Item, 0)
	for rows.Next() {
		var item Item
		var key sql.NullString
		var desc sql.NullString
		var icon sql.NullString
		var url sql.NullString
		var tags []byte
		var actions []byte
		var audience []byte
		if err := rows.Scan(
			&item.ID, &item.SpaceID, &item.Type, &key, &item.Title, &desc, &icon, &url, &item.Pinned, &tags, &actions, &audience, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan directory item: %w", err)
		}
		item.Key = key.String
		item.Description = desc.String
		item.IconURL = icon.String
		item.URL = url.String
		item.Tags = decodeGroups(tags)
		item.ActionKeys = decodeGroups(actions)
		item.AudienceGroups = decodeGroups(audience)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate directory: %w", err)
	}
	return items, nil
}

func Get(ctx context.Context, db *sql.DB, id string) (Item, error) {
	if id == "" {
		return Item{}, fmt.Errorf("id is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
		       service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
		       classification, depends_on_json, created_at
		FROM directory_items
		WHERE id = $1
	`, id)
	return scanDirectoryItem(row)
}

func GetByKey(ctx context.Context, db *sql.DB, spaceID int, key string) (Item, error) {
	if spaceID == 0 {
		return Item{}, fmt.Errorf("space_id is required")
	}
	if key == "" {
		return Item{}, fmt.Errorf("key is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
		       service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
		       classification, depends_on_json, created_at
		FROM directory_items
		WHERE space_id = $1 AND key = $2
		ORDER BY created_at DESC
		LIMIT 1
	`, spaceID, key)
	return scanDirectoryItem(row)
}

type directoryScanner interface {
	Scan(dest ...any) error
}

func scanDirectoryItem(row directoryScanner) (Item, error) {
	var item Item
	var key sql.NullString
	var desc sql.NullString
	var icon sql.NullString
	var url sql.NullString
	var serviceType sql.NullString
	var accessPath sql.NullString
	var runbookURL sql.NullString
	var classification sql.NullString
	var tags []byte
	var actions []byte
	var audience []byte
	var owners []byte
	var links []byte
	var endpoints []byte
	var tier sql.NullString
	var lifecycle sql.NullString
	var dependsOn []byte
	if err := row.Scan(
		&item.ID, &item.SpaceID, &item.Type, &key, &item.Title, &desc, &icon, &url, &item.Pinned, &tags, &actions, &audience,
		&serviceType, &owners, &links, &endpoints, &tier, &lifecycle, &accessPath, &runbookURL, &classification, &dependsOn, &item.CreatedAt,
	); err != nil {
		return Item{}, fmt.Errorf("scan directory item: %w", err)
	}
	item.Key = key.String
	item.Description = desc.String
	item.IconURL = icon.String
	item.URL = url.String
	item.ServiceType = serviceType.String
	item.AccessPath = accessPath.String
	item.RunbookURL = runbookURL.String
	item.Classification = classification.String
	item.Tags = decodeGroups(tags)
	item.ActionKeys = decodeGroups(actions)
	item.AudienceGroups = decodeGroups(audience)
	item.Owners = normalizeJSONRaw(owners, "{}")
	item.Links = normalizeJSONRaw(links, "{}")
	item.Endpoints = normalizeJSONRaw(endpoints, "[]")
	item.Tier = tier.String
	item.Lifecycle = lifecycle.String
	item.DependsOn = normalizeJSONRaw(dependsOn, "[]")
	return item, nil
}

func Create(ctx context.Context, db *sql.DB, input CreateInput) (Item, error) {
	if input.SpaceID == 0 {
		return Item{}, fmt.Errorf("space_id is required")
	}
	if input.Title == "" {
		return Item{}, fmt.Errorf("title is required")
	}
	if input.Type == "" {
		input.Type = "resource"
	}
	if len(input.AudienceGroups) == 0 {
		input.AudienceGroups = defaultAudienceGroups(ctx, db, input.SpaceID)
	}
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return Item{}, fmt.Errorf("encode tags: %w", err)
	}
	actionsJSON, err := json.Marshal(input.ActionKeys)
	if err != nil {
		return Item{}, fmt.Errorf("encode action keys: %w", err)
	}
	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Item{}, fmt.Errorf("encode audience groups: %w", err)
	}
	ownersJSON := normalizeJSONRaw(input.Owners, "{}")
	linksJSON := normalizeJSONRaw(input.Links, "{}")
	endpointsJSON := normalizeJSONRaw(input.Endpoints, "[]")
	dependsOnJSON := normalizeJSONRaw(input.DependsOn, "[]")

	item, err := scanDirectoryItem(db.QueryRowContext(ctx, `
		INSERT INTO directory_items (
			space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
			service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
			classification, depends_on_json
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)
		RETURNING id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
		          service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
		          classification, depends_on_json, created_at
	`, input.SpaceID, input.Type, nullableString(input.Key), input.Title, nullableString(input.Description), nullableString(input.IconURL), nullableString(input.URL), input.Pinned, tagsJSON, actionsJSON, audienceJSON,
		input.ServiceType, ownersJSON, linksJSON, endpointsJSON, input.Tier, input.Lifecycle, nullableString(input.AccessPath),
		nullableString(input.RunbookURL), nullableString(input.Classification), dependsOnJSON))
	if err != nil {
		return Item{}, fmt.Errorf("create directory item: %w", err)
	}
	return item, nil
}

func Update(ctx context.Context, db *sql.DB, id string, input UpdateInput) (Item, error) {
	if id == "" {
		return Item{}, fmt.Errorf("id is required")
	}
	if input.Title == "" {
		return Item{}, fmt.Errorf("title is required")
	}
	if input.Type == "" {
		input.Type = "resource"
	}
	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Item{}, fmt.Errorf("encode audience groups: %w", err)
	}
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return Item{}, fmt.Errorf("encode tags: %w", err)
	}
	actionsJSON, err := json.Marshal(input.ActionKeys)
	if err != nil {
		return Item{}, fmt.Errorf("encode action keys: %w", err)
	}
	ownersJSON := normalizeJSONRaw(input.Owners, "{}")
	linksJSON := normalizeJSONRaw(input.Links, "{}")
	endpointsJSON := normalizeJSONRaw(input.Endpoints, "[]")
	dependsOnJSON := normalizeJSONRaw(input.DependsOn, "[]")
	item, err := scanDirectoryItem(db.QueryRowContext(ctx, `
		UPDATE directory_items
		SET type = $1,
		    key = $2,
		    title = $3,
		    description = $4,
		    icon_url = $5,
		    url = $6,
		    pinned = $7,
		    tags = $8,
		    action_keys = $9,
		    audience_groups = $10,
		    service_type = $11,
		    owners_json = $12,
		    links_json = $13,
		    endpoints_json = $14,
		    tier = $15,
		    lifecycle = $16,
		    access_path = $17,
		    runbook_url = $18,
		    classification = $19,
		    depends_on_json = $20
		WHERE id = $21
		RETURNING id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
		          service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
		          classification, depends_on_json, created_at
	`, input.Type, nullableString(input.Key), input.Title, nullableString(input.Description), nullableString(input.IconURL), nullableString(input.URL), input.Pinned, tagsJSON, actionsJSON, audienceJSON,
		input.ServiceType, ownersJSON, linksJSON, endpointsJSON, input.Tier, input.Lifecycle, nullableString(input.AccessPath),
		nullableString(input.RunbookURL), nullableString(input.Classification), dependsOnJSON, id))
	if err != nil {
		return Item{}, fmt.Errorf("update directory item: %w", err)
	}
	return item, nil
}

func Delete(ctx context.Context, db *sql.DB, id string) error {
	if id == "" {
		return fmt.Errorf("id is required")
	}
	res, err := db.ExecContext(ctx, `DELETE FROM directory_items WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete directory item: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("directory item not found")
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

func normalizeJSONRaw(value json.RawMessage, fallback string) json.RawMessage {
	if len(value) == 0 {
		return json.RawMessage(fallback)
	}
	return value
}

func nullableString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}
