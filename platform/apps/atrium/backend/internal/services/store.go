package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Service struct {
	ID             int             `json:"id"`
	Key            string          `json:"key"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	IconURL        string          `json:"icon_url"`
	ServiceType    string          `json:"service_type"`
	Tags           []string        `json:"tags"`
	Owners         json.RawMessage `json:"owners"`
	Links          json.RawMessage `json:"links"`
	Endpoints      json.RawMessage `json:"endpoints"`
	Tier           string          `json:"tier"`
	Lifecycle      string          `json:"lifecycle"`
	Classification string          `json:"classification"`
	DependsOn      json.RawMessage `json:"depends_on"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type ServiceInput struct {
	Key            string          `json:"key"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	IconURL        string          `json:"icon_url"`
	ServiceType    string          `json:"service_type"`
	Tags           []string        `json:"tags"`
	Owners         json.RawMessage `json:"owners"`
	Links          json.RawMessage `json:"links"`
	Endpoints      json.RawMessage `json:"endpoints"`
	Tier           string          `json:"tier"`
	Lifecycle      string          `json:"lifecycle"`
	Classification string          `json:"classification"`
	DependsOn      json.RawMessage `json:"depends_on"`
}

type Placement struct {
	ID              int       `json:"id"`
	ServiceID       int       `json:"service_id"`
	ServiceKey      string    `json:"service_key"`
	SpaceID         int       `json:"space_id"`
	SpaceSlug       string    `json:"space_slug"`
	Label           string    `json:"label"`
	Pinned          bool      `json:"pinned"`
	Order           int       `json:"order"`
	GroupLabel      string    `json:"group"`
	AudienceGroups  []string  `json:"audience_groups"`
	AllowedActions  []string  `json:"allowed_actions"`
	VisibleLinks    []string  `json:"visible_links"`
	PrimaryURL      string    `json:"primary_url"`
	DefaultEndpoint string    `json:"default_endpoint"`
	AccessPath      string    `json:"access_path"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PlacementInput struct {
	ServiceKey      string   `json:"service_key"`
	SpaceID         int      `json:"space_id"`
	Label           string   `json:"label"`
	Pinned          bool     `json:"pinned"`
	Order           int      `json:"order"`
	GroupLabel      string   `json:"group"`
	AudienceGroups  []string `json:"audience_groups"`
	AllowedActions  []string `json:"allowed_actions"`
	VisibleLinks    []string `json:"visible_links"`
	PrimaryURL      string   `json:"primary_url"`
	DefaultEndpoint string   `json:"default_endpoint"`
	AccessPath      string   `json:"access_path"`
}

func ListServices(ctx context.Context, db *sql.DB) ([]Service, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, key, title, description, icon_url, service_type, tags, owners_json,
		       links_json, endpoints_json, tier, lifecycle, classification, depends_on_json,
		       created_at, updated_at
		FROM services
		ORDER BY title
	`)
	if err != nil {
		return nil, fmt.Errorf("list services: %w", err)
	}
	defer rows.Close()

	items := make([]Service, 0)
	for rows.Next() {
		item, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate services: %w", err)
	}
	return items, nil
}

func GetService(ctx context.Context, db *sql.DB, id int) (Service, error) {
	if id == 0 {
		return Service{}, fmt.Errorf("id is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT id, key, title, description, icon_url, service_type, tags, owners_json,
		       links_json, endpoints_json, tier, lifecycle, classification, depends_on_json,
		       created_at, updated_at
		FROM services
		WHERE id = $1
	`, id)
	return scanService(row)
}

func GetServiceByKey(ctx context.Context, db *sql.DB, key string) (Service, error) {
	if strings.TrimSpace(key) == "" {
		return Service{}, fmt.Errorf("key is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT id, key, title, description, icon_url, service_type, tags, owners_json,
		       links_json, endpoints_json, tier, lifecycle, classification, depends_on_json,
		       created_at, updated_at
		FROM services
		WHERE key = $1
	`, key)
	return scanService(row)
}

func CreateService(ctx context.Context, db *sql.DB, input ServiceInput) (Service, error) {
	if strings.TrimSpace(input.Key) == "" {
		return Service{}, fmt.Errorf("key is required")
	}
	if strings.TrimSpace(input.Title) == "" {
		return Service{}, fmt.Errorf("title is required")
	}
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return Service{}, fmt.Errorf("encode tags: %w", err)
	}
	ownersJSON := normalizeJSONRaw(input.Owners, "{}")
	linksJSON := normalizeJSONRaw(input.Links, "{}")
	endpointsJSON := normalizeJSONRaw(input.Endpoints, "[]")
	dependsOnJSON := normalizeJSONRaw(input.DependsOn, "[]")

	item, err := scanService(db.QueryRowContext(ctx, `
		INSERT INTO services (
			key, title, description, icon_url, service_type, tags, owners_json, links_json,
			endpoints_json, tier, lifecycle, classification, depends_on_json, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, NOW()
		)
		RETURNING id, key, title, description, icon_url, service_type, tags, owners_json,
		          links_json, endpoints_json, tier, lifecycle, classification, depends_on_json,
		          created_at, updated_at
	`, input.Key, input.Title, input.Description, nullableString(input.IconURL), input.ServiceType, tagsJSON, ownersJSON,
		linksJSON, endpointsJSON, input.Tier, input.Lifecycle, input.Classification, dependsOnJSON))
	if err != nil {
		return Service{}, fmt.Errorf("create service: %w", err)
	}
	return item, nil
}

func UpdateService(ctx context.Context, db *sql.DB, id int, input ServiceInput) (Service, error) {
	if id == 0 {
		return Service{}, fmt.Errorf("id is required")
	}
	if strings.TrimSpace(input.Key) == "" {
		return Service{}, fmt.Errorf("key is required")
	}
	if strings.TrimSpace(input.Title) == "" {
		return Service{}, fmt.Errorf("title is required")
	}
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return Service{}, fmt.Errorf("encode tags: %w", err)
	}
	ownersJSON := normalizeJSONRaw(input.Owners, "{}")
	linksJSON := normalizeJSONRaw(input.Links, "{}")
	endpointsJSON := normalizeJSONRaw(input.Endpoints, "[]")
	dependsOnJSON := normalizeJSONRaw(input.DependsOn, "[]")

	item, err := scanService(db.QueryRowContext(ctx, `
		UPDATE services
		SET key = $1,
		    title = $2,
		    description = $3,
		    icon_url = $4,
		    service_type = $5,
		    tags = $6,
		    owners_json = $7,
		    links_json = $8,
		    endpoints_json = $9,
		    tier = $10,
		    lifecycle = $11,
		    classification = $12,
		    depends_on_json = $13,
		    updated_at = NOW()
		WHERE id = $14
		RETURNING id, key, title, description, icon_url, service_type, tags, owners_json,
		          links_json, endpoints_json, tier, lifecycle, classification, depends_on_json,
		          created_at, updated_at
	`, input.Key, input.Title, input.Description, nullableString(input.IconURL), input.ServiceType, tagsJSON, ownersJSON,
		linksJSON, endpointsJSON, input.Tier, input.Lifecycle, input.Classification, dependsOnJSON, id))
	if err != nil {
		return Service{}, fmt.Errorf("update service: %w", err)
	}
	if err := materializeService(ctx, db, item); err != nil {
		return Service{}, err
	}
	return item, nil
}

func DeleteService(ctx context.Context, db *sql.DB, id int) error {
	if id == 0 {
		return fmt.Errorf("id is required")
	}
	service, err := GetService(ctx, db, id)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `DELETE FROM services WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete service: %w", err)
	}
	_, _ = db.ExecContext(ctx, `DELETE FROM directory_items WHERE type = 'service' AND key = $1`, service.Key)
	return nil
}

func ListPlacements(ctx context.Context, db *sql.DB, spaceID *int, serviceKey *string) ([]Placement, error) {
	query := `
		SELECT sp.id, sp.service_id, s.key, sp.space_id, spaces.slug, sp.label, sp.pinned, sp.sort_order,
		       sp.group_label, sp.audience_groups, sp.allowed_actions, sp.visible_links, sp.primary_url,
		       sp.default_endpoint, sp.access_path, sp.created_at, sp.updated_at
		FROM service_placements sp
		JOIN services s ON s.id = sp.service_id
		JOIN spaces ON spaces.id = sp.space_id
	`
	args := make([]any, 0, 2)
	clauses := make([]string, 0, 2)
	if spaceID != nil && *spaceID > 0 {
		clauses = append(clauses, fmt.Sprintf("sp.space_id = $%d", len(args)+1))
		args = append(args, *spaceID)
	}
	if serviceKey != nil && strings.TrimSpace(*serviceKey) != "" {
		clauses = append(clauses, fmt.Sprintf("s.key = $%d", len(args)+1))
		args = append(args, strings.TrimSpace(*serviceKey))
	}
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY sp.created_at DESC"

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list placements: %w", err)
	}
	defer rows.Close()

	items := make([]Placement, 0)
	for rows.Next() {
		item, err := scanPlacement(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate placements: %w", err)
	}
	return items, nil
}

func GetPlacement(ctx context.Context, db *sql.DB, id int) (Placement, error) {
	if id == 0 {
		return Placement{}, fmt.Errorf("id is required")
	}
	row := db.QueryRowContext(ctx, `
		SELECT sp.id, sp.service_id, s.key, sp.space_id, spaces.slug, sp.label, sp.pinned, sp.sort_order,
		       sp.group_label, sp.audience_groups, sp.allowed_actions, sp.visible_links, sp.primary_url,
		       sp.default_endpoint, sp.access_path, sp.created_at, sp.updated_at
		FROM service_placements sp
		JOIN services s ON s.id = sp.service_id
		JOIN spaces ON spaces.id = sp.space_id
		WHERE sp.id = $1
	`, id)
	return scanPlacement(row)
}

func CreatePlacement(ctx context.Context, db *sql.DB, input PlacementInput) (Placement, error) {
	if strings.TrimSpace(input.ServiceKey) == "" {
		return Placement{}, fmt.Errorf("service_key is required")
	}
	if input.SpaceID == 0 {
		return Placement{}, fmt.Errorf("space_id is required")
	}
	serviceID, err := serviceIDByKey(ctx, db, input.ServiceKey)
	if err != nil {
		return Placement{}, err
	}
	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Placement{}, fmt.Errorf("encode audience_groups: %w", err)
	}
	actionsJSON, err := json.Marshal(input.AllowedActions)
	if err != nil {
		return Placement{}, fmt.Errorf("encode allowed_actions: %w", err)
	}
	linksJSON, err := json.Marshal(input.VisibleLinks)
	if err != nil {
		return Placement{}, fmt.Errorf("encode visible_links: %w", err)
	}
	var placementID int
	if err := db.QueryRowContext(ctx, `
		INSERT INTO service_placements (
			service_id, space_id, label, pinned, sort_order, group_label, audience_groups,
			allowed_actions, visible_links, primary_url, default_endpoint, access_path, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, NOW()
		)
		ON CONFLICT (service_id, space_id) DO UPDATE SET
			label = EXCLUDED.label,
			pinned = EXCLUDED.pinned,
			sort_order = EXCLUDED.sort_order,
			group_label = EXCLUDED.group_label,
			audience_groups = EXCLUDED.audience_groups,
			allowed_actions = EXCLUDED.allowed_actions,
			visible_links = EXCLUDED.visible_links,
			primary_url = EXCLUDED.primary_url,
			default_endpoint = EXCLUDED.default_endpoint,
			access_path = EXCLUDED.access_path,
			updated_at = NOW()
	`, serviceID, input.SpaceID, input.Label, input.Pinned, input.Order, input.GroupLabel, audienceJSON,
		actionsJSON, linksJSON, nullableString(input.PrimaryURL), nullableString(input.DefaultEndpoint), nullableString(input.AccessPath)).Scan(&placementID); err != nil {
		return Placement{}, fmt.Errorf("create placement: %w", err)
	}
	item, err := GetPlacement(ctx, db, placementID)
	if err != nil {
		return Placement{}, err
	}
	if err := materializePlacement(ctx, db, item); err != nil {
		return Placement{}, err
	}
	return item, nil
}

func UpdatePlacement(ctx context.Context, db *sql.DB, id int, input PlacementInput) (Placement, error) {
	if id == 0 {
		return Placement{}, fmt.Errorf("id is required")
	}
	if strings.TrimSpace(input.ServiceKey) == "" {
		return Placement{}, fmt.Errorf("service_key is required")
	}
	if input.SpaceID == 0 {
		return Placement{}, fmt.Errorf("space_id is required")
	}
	serviceID, err := serviceIDByKey(ctx, db, input.ServiceKey)
	if err != nil {
		return Placement{}, err
	}
	audienceJSON, err := json.Marshal(input.AudienceGroups)
	if err != nil {
		return Placement{}, fmt.Errorf("encode audience_groups: %w", err)
	}
	actionsJSON, err := json.Marshal(input.AllowedActions)
	if err != nil {
		return Placement{}, fmt.Errorf("encode allowed_actions: %w", err)
	}
	linksJSON, err := json.Marshal(input.VisibleLinks)
	if err != nil {
		return Placement{}, fmt.Errorf("encode visible_links: %w", err)
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE service_placements
		SET service_id = $1,
		    space_id = $2,
		    label = $3,
		    pinned = $4,
		    sort_order = $5,
		    group_label = $6,
		    audience_groups = $7,
		    allowed_actions = $8,
		    visible_links = $9,
		    primary_url = $10,
		    default_endpoint = $11,
		    access_path = $12,
		    updated_at = NOW()
		WHERE id = $13
	`, serviceID, input.SpaceID, input.Label, input.Pinned, input.Order, input.GroupLabel, audienceJSON,
		actionsJSON, linksJSON, nullableString(input.PrimaryURL), nullableString(input.DefaultEndpoint), nullableString(input.AccessPath), id); err != nil {
		return Placement{}, fmt.Errorf("update placement: %w", err)
	}
	item, err := GetPlacement(ctx, db, id)
	if err != nil {
		return Placement{}, err
	}
	if err := materializePlacement(ctx, db, item); err != nil {
		return Placement{}, err
	}
	return item, nil
}

func DeletePlacement(ctx context.Context, db *sql.DB, id int) error {
	if id == 0 {
		return fmt.Errorf("id is required")
	}
	placement, err := GetPlacement(ctx, db, id)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `DELETE FROM service_placements WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete placement: %w", err)
	}
	_, _ = db.ExecContext(ctx, `
		DELETE FROM directory_items
		WHERE type = 'service' AND key = $1 AND space_id = $2
	`, placement.ServiceKey, placement.SpaceID)
	return nil
}

type serviceScanner interface {
	Scan(dest ...any) error
}

func scanService(row serviceScanner) (Service, error) {
	var item Service
	var desc sql.NullString
	var icon sql.NullString
	var tags []byte
	var owners []byte
	var links []byte
	var endpoints []byte
	var tier sql.NullString
	var lifecycle sql.NullString
	var classification sql.NullString
	var dependsOn []byte
	if err := row.Scan(
		&item.ID,
		&item.Key,
		&item.Title,
		&desc,
		&icon,
		&item.ServiceType,
		&tags,
		&owners,
		&links,
		&endpoints,
		&tier,
		&lifecycle,
		&classification,
		&dependsOn,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Service{}, fmt.Errorf("scan service: %w", err)
	}
	item.Description = desc.String
	item.IconURL = icon.String
	item.Tags = decodeStringSlice(tags)
	item.Owners = normalizeJSONRaw(owners, "{}")
	item.Links = normalizeJSONRaw(links, "{}")
	item.Endpoints = normalizeJSONRaw(endpoints, "[]")
	item.Tier = tier.String
	item.Lifecycle = lifecycle.String
	item.Classification = classification.String
	item.DependsOn = normalizeJSONRaw(dependsOn, "[]")
	return item, nil
}

type placementScanner interface {
	Scan(dest ...any) error
}

func scanPlacement(row placementScanner) (Placement, error) {
	var item Placement
	var label sql.NullString
	var groupLabel sql.NullString
	var order sql.NullInt64
	var audience []byte
	var actions []byte
	var visibleLinks []byte
	var primaryURL sql.NullString
	var defaultEndpoint sql.NullString
	var accessPath sql.NullString
	if err := row.Scan(
		&item.ID,
		&item.ServiceID,
		&item.ServiceKey,
		&item.SpaceID,
		&item.SpaceSlug,
		&label,
		&item.Pinned,
		&order,
		&groupLabel,
		&audience,
		&actions,
		&visibleLinks,
		&primaryURL,
		&defaultEndpoint,
		&accessPath,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Placement{}, fmt.Errorf("scan placement: %w", err)
	}
	item.Label = label.String
	item.Order = int(order.Int64)
	item.GroupLabel = groupLabel.String
	item.AudienceGroups = decodeStringSlice(audience)
	item.AllowedActions = decodeStringSlice(actions)
	item.VisibleLinks = decodeStringSlice(visibleLinks)
	item.PrimaryURL = primaryURL.String
	item.DefaultEndpoint = defaultEndpoint.String
	item.AccessPath = accessPath.String
	return item, nil
}

func serviceIDByKey(ctx context.Context, db *sql.DB, key string) (int, error) {
	var id int
	if err := db.QueryRowContext(ctx, `SELECT id FROM services WHERE key = $1`, key).Scan(&id); err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("service %s not found", key)
		}
		return 0, fmt.Errorf("load service: %w", err)
	}
	return id, nil
}

func spaceSlugByID(ctx context.Context, db *sql.DB, spaceID int) string {
	var slug string
	_ = db.QueryRowContext(ctx, `SELECT slug FROM spaces WHERE id = $1`, spaceID).Scan(&slug)
	return slug
}

func decodeStringSlice(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil {
		return []string{}
	}
	return out
}

func normalizeJSONRaw(value []byte, fallback string) json.RawMessage {
	if len(value) == 0 {
		return json.RawMessage(fallback)
	}
	return value
}

func nullableString(value string) sql.NullString {
	if strings.TrimSpace(value) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}

func materializeService(ctx context.Context, db *sql.DB, service Service) error {
	items, err := ListPlacements(ctx, db, nil, &service.Key)
	if err != nil {
		return err
	}
	for _, placement := range items {
		if err := materializePlacement(ctx, db, placement); err != nil {
			return err
		}
	}
	return nil
}

func materializePlacement(ctx context.Context, db *sql.DB, placement Placement) error {
	service, err := GetServiceByKey(ctx, db, placement.ServiceKey)
	if err != nil {
		return err
	}
	linksPayload := normalizeJSONRaw(service.Links, "{}")
	if len(placement.VisibleLinks) > 0 {
		if filtered, err := filterLinks(linksPayload, placement.VisibleLinks); err == nil {
			linksPayload = filtered
		}
	}
	endpointsPayload := normalizeJSONRaw(service.Endpoints, "[]")
	url := resolvePrimaryURL(placement, linksPayload, endpointsPayload)
	runbookURL := resolveRunbookURL(linksPayload)

	title := service.Title
	if strings.TrimSpace(placement.Label) != "" {
		title = placement.Label
	}

	audience := placement.AudienceGroups
	if len(audience) == 0 {
		if loaded, err := loadSpaceGroups(ctx, db, placement.SpaceID); err == nil {
			audience = loaded
		}
	}
	audienceJSON, err := json.Marshal(audience)
	if err != nil {
		return fmt.Errorf("encode audience for %s: %w", placement.ServiceKey, err)
	}
	actionJSON, err := json.Marshal(placement.AllowedActions)
	if err != nil {
		return fmt.Errorf("encode actions for %s: %w", placement.ServiceKey, err)
	}
	tagsJSON, err := json.Marshal(service.Tags)
	if err != nil {
		return fmt.Errorf("encode tags for %s: %w", placement.ServiceKey, err)
	}
	ownersJSON := normalizeJSONRaw(service.Owners, "{}")
	dependsOnJSON := normalizeJSONRaw(service.DependsOn, "[]")

	_, err = db.ExecContext(ctx, `
		INSERT INTO directory_items (
			space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys, audience_groups,
			service_type, owners_json, links_json, endpoints_json, tier, lifecycle, access_path, runbook_url,
			classification, depends_on_json
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)
		ON CONFLICT (space_id, key) DO UPDATE SET
			type = EXCLUDED.type,
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			icon_url = EXCLUDED.icon_url,
			url = EXCLUDED.url,
			pinned = EXCLUDED.pinned,
			tags = EXCLUDED.tags,
			action_keys = EXCLUDED.action_keys,
			audience_groups = EXCLUDED.audience_groups,
			service_type = EXCLUDED.service_type,
			owners_json = EXCLUDED.owners_json,
			links_json = EXCLUDED.links_json,
			endpoints_json = EXCLUDED.endpoints_json,
			tier = EXCLUDED.tier,
			lifecycle = EXCLUDED.lifecycle,
			access_path = EXCLUDED.access_path,
			runbook_url = EXCLUDED.runbook_url,
			classification = EXCLUDED.classification,
			depends_on_json = EXCLUDED.depends_on_json
	`, placement.SpaceID, "service", service.Key, title, service.Description, nullableString(service.IconURL),
		url, placement.Pinned, tagsJSON, actionJSON, audienceJSON, service.ServiceType, ownersJSON, linksPayload,
		endpointsPayload, service.Tier, service.Lifecycle, placement.AccessPath, runbookURL, service.Classification, dependsOnJSON)
	if err != nil {
		return fmt.Errorf("materialize placement %s: %w", placement.ServiceKey, err)
	}
	return nil
}

func filterLinks(raw json.RawMessage, allowed []string) (json.RawMessage, error) {
	if len(allowed) == 0 {
		return raw, nil
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return raw, err
	}
	allow := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		if strings.TrimSpace(key) != "" {
			allow[key] = struct{}{}
		}
	}
	filtered := make(map[string]any)
	for key, value := range payload {
		if _, ok := allow[key]; ok {
			filtered[key] = value
		}
	}
	out, err := json.Marshal(filtered)
	if err != nil {
		return raw, err
	}
	return json.RawMessage(out), nil
}

func resolvePrimaryURL(placement Placement, links json.RawMessage, endpoints json.RawMessage) string {
	if strings.TrimSpace(placement.PrimaryURL) != "" {
		return placement.PrimaryURL
	}
	if url := resolveLinkURL(links); url != "" {
		return url
	}
	if url := resolveEndpointURL(endpoints, placement.DefaultEndpoint); url != "" {
		return url
	}
	return ""
}

func resolveLinkURL(links json.RawMessage) string {
	var payload map[string]any
	if err := json.Unmarshal(links, &payload); err != nil {
		return ""
	}
	candidates := []string{"docs", "runbook", "repo", "dashboard", "dashboards", "logs"}
	for _, key := range candidates {
		if value, ok := payload[key]; ok {
			switch typed := value.(type) {
			case string:
				return typed
			case []any:
				if len(typed) > 0 {
					if text, ok := typed[0].(string); ok {
						return text
					}
				}
			}
		}
	}
	return ""
}

func resolveRunbookURL(links json.RawMessage) string {
	var payload map[string]any
	if err := json.Unmarshal(links, &payload); err != nil {
		return ""
	}
	if value, ok := payload["runbook"]; ok {
		if url, ok := value.(string); ok {
			return url
		}
	}
	return ""
}

func resolveEndpointURL(endpoints json.RawMessage, preferred string) string {
	var payload []map[string]any
	if err := json.Unmarshal(endpoints, &payload); err != nil {
		return ""
	}
	preferred = strings.TrimSpace(preferred)
	if preferred != "" {
		for _, item := range payload {
			if key, ok := item["key"].(string); ok && key == preferred {
				if url, ok := item["url"].(string); ok {
					return url
				}
			}
		}
	}
	for _, item := range payload {
		if url, ok := item["url"].(string); ok {
			return url
		}
	}
	return ""
}

func loadSpaceGroups(ctx context.Context, db *sql.DB, spaceID int) ([]string, error) {
	var raw []byte
	if err := db.QueryRowContext(ctx, `SELECT visibility_groups FROM spaces WHERE id = $1`, spaceID).Scan(&raw); err != nil {
		return nil, err
	}
	var groups []string
	if len(raw) == 0 {
		return []string{}, nil
	}
	if err := json.Unmarshal(raw, &groups); err != nil {
		return []string{}, nil
	}
	return groups, nil
}
