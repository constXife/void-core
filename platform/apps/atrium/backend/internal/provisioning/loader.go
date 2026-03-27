package provisioning

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"gopkg.in/yaml.v3"
	"os"
	"path/filepath"
	"strings"
)

type File struct {
	Roles          []Role          `yaml:"roles" json:"roles"`
	Templates      []Template      `yaml:"dashboard_templates" json:"dashboard_templates"`
	Spaces         []Space         `yaml:"spaces" json:"spaces"`
	DirectoryItems []DirectoryItem `yaml:"directory_items" json:"directory_items"`
}

type Space struct {
	ID                   string   `yaml:"id" json:"id"`
	Title                string   `yaml:"title" json:"title"`
	State                string   `yaml:"state" json:"state"`
	Type                 string   `yaml:"type" json:"type"`
	Parent               string   `yaml:"parent" json:"parent"`
	DashboardTemplate    string   `yaml:"dashboard_template" json:"dashboard_template"`
	AccessMode           string   `yaml:"access_mode" json:"access_mode"`
	IsDefaultPublicEntry *bool    `yaml:"is_default_public_entry" json:"is_default_public_entry"`
	LayoutMode           string   `yaml:"layout_mode" json:"layout_mode"`
	BackgroundURL        string   `yaml:"background_url" json:"background_url"`
	URL                  string   `yaml:"url" json:"url"`
	IsLockable           *bool    `yaml:"is_lockable" json:"is_lockable"`
	VisibilityGroups     []string `yaml:"groups" json:"groups"`
	DisplayConfig        any      `yaml:"display_config" json:"display_config"`
	PersonalizationRules any      `yaml:"personalization_rules" json:"personalization_rules"`
	PublicEntry          any      `yaml:"public_entry" json:"public_entry"`
}

type Role struct {
	Key         string   `yaml:"key" json:"key"`
	Name        string   `yaml:"name" json:"name"`
	Permissions []string `yaml:"permissions" json:"permissions"`
	IsBuiltin   *bool    `yaml:"is_builtin" json:"is_builtin"`
}

type Template struct {
	Key     string `yaml:"key" json:"key"`
	Version int    `yaml:"version" json:"version"`
	Blocks  any    `yaml:"blocks" json:"blocks"`
}

type DirectoryItem struct {
	Key            string   `yaml:"key" json:"key"`
	Title          string   `yaml:"title" json:"title"`
	Description    string   `yaml:"description" json:"description"`
	IconURL        string   `yaml:"icon_url" json:"icon_url"`
	URL            string   `yaml:"url" json:"url"`
	Type           string   `yaml:"type" json:"type"`
	Space          string   `yaml:"space" json:"space"`
	Pinned         bool     `yaml:"pinned" json:"pinned"`
	Tags           []string `yaml:"tags" json:"tags"`
	ActionKeys     []string `yaml:"action_keys" json:"action_keys"`
	AudienceGroups []string `yaml:"audience_groups" json:"audience_groups"`
	ServiceType    string   `yaml:"service_type" json:"service_type"`
	Owners         any      `yaml:"owners" json:"owners"`
	Links          any      `yaml:"links" json:"links"`
	Endpoints      any      `yaml:"endpoints" json:"endpoints"`
	Tier           string   `yaml:"tier" json:"tier"`
	Lifecycle      string   `yaml:"lifecycle" json:"lifecycle"`
	AccessPath     string   `yaml:"access_path" json:"access_path"`
	RunbookURL     string   `yaml:"runbook_url" json:"runbook_url"`
	Classification string   `yaml:"classification" json:"classification"`
	DependsOn      any      `yaml:"depends_on" json:"depends_on"`
}

type Options struct {
	ArchiveMissing bool
	PruneTemplates bool
	PruneDirectory bool
}

type spaceSyncIndex struct {
	Declared map[string]int
	Active   map[string]int
}

func Load(ctx context.Context, db *sql.DB, path string, opts Options) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read provisioning file: %w", err)
	}

	file, err := parseFile(path, data)
	if err != nil {
		return err
	}

	if err := syncRoles(ctx, db, file.Roles); err != nil {
		return err
	}

	if err := syncDashboardTemplates(ctx, db, file.Templates); err != nil {
		return err
	}

	spaceIndex, err := syncSpaces(ctx, db, file.Spaces)
	if err != nil {
		return err
	}
	activeDirectoryItems := filterDirectoryItemsForActiveSpaces(file.DirectoryItems, spaceIndex)

	if err := syncDirectoryItems(ctx, db, activeDirectoryItems, spaceIndex.Active); err != nil {
		return err
	}

	if opts.PruneTemplates {
		if err := clearMissingTemplates(ctx, db, file.Templates); err != nil {
			return err
		}
	}
	if opts.PruneDirectory {
		if err := clearMissingDirectoryItems(ctx, db, spaceIndex.Active, activeDirectoryItems); err != nil {
			return err
		}
	}

	if opts.ArchiveMissing {
		if err := clearMissingSpaces(ctx, db, spaceIndex.Declared); err != nil {
			return err
		}
	}

	if err := clearArchivedSpaceArtifacts(ctx, db); err != nil {
		return err
	}

	return nil
}

func parseFile(path string, data []byte) (File, error) {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" {
		return File{}, nil
	}

	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".json" || strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var file File
		if strings.HasPrefix(trimmed, "[") {
			return File{}, fmt.Errorf("invalid provisioning format: expected object with roles/dashboard_templates/spaces/directory_items")
		}
		if err := json.Unmarshal([]byte(trimmed), &file); err != nil {
			return File{}, fmt.Errorf("parse provisioning file: %w", err)
		}
		return file, nil
	}

	var file File
	if err := yaml.Unmarshal([]byte(trimmed), &file); err != nil {
		return File{}, fmt.Errorf("parse provisioning file: %w", err)
	}
	return file, nil
}

func syncSpaces(ctx context.Context, db *sql.DB, spaces []Space) (spaceSyncIndex, error) {
	index := spaceSyncIndex{
		Declared: make(map[string]int, len(spaces)),
		Active:   make(map[string]int, len(spaces)),
	}
	defaultPublicSpaceID := ""
	for _, space := range spaces {
		if normalizeSpaceState(space.State) != "active" {
			continue
		}
		accessMode := strings.TrimSpace(space.AccessMode)
		if accessMode != "public_readonly" {
			continue
		}
		if space.IsDefaultPublicEntry == nil || !*space.IsDefaultPublicEntry {
			continue
		}
		if defaultPublicSpaceID != "" {
			return spaceSyncIndex{}, fmt.Errorf("multiple default public entry spaces: %s, %s", defaultPublicSpaceID, space.ID)
		}
		defaultPublicSpaceID = space.ID
	}
	if defaultPublicSpaceID != "" {
		if _, err := db.ExecContext(ctx, `
			UPDATE spaces
			SET is_default_public_entry = false
			WHERE is_default_public_entry = true
		`); err != nil {
			return spaceSyncIndex{}, fmt.Errorf("clear existing default public entry: %w", err)
		}
	}
	for _, space := range spaces {
		if space.ID == "" {
			return spaceSyncIndex{}, fmt.Errorf("space id is required")
		}
		layout := space.LayoutMode
		if layout == "" {
			layout = "grid"
		}
		lockable := true
		if space.IsLockable != nil {
			lockable = *space.IsLockable
		}

		displayConfig, err := normalizeJSON(space.DisplayConfig)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("space %s display_config: %w", space.ID, err)
		}
		if space.URL != "" {
			displayConfig, err = mergeDisplayConfigURL(displayConfig, space.URL)
			if err != nil {
				return spaceSyncIndex{}, fmt.Errorf("space %s display_config url: %w", space.ID, err)
			}
		}
		rulesConfig, err := normalizeJSON(space.PersonalizationRules)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("space %s personalization_rules: %w", space.ID, err)
		}
		publicEntryConfig, err := normalizeJSON(space.PublicEntry)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("space %s public_entry: %w", space.ID, err)
		}
		groupsJSON, err := json.Marshal(space.VisibilityGroups)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("space %s groups: %w", space.ID, err)
		}
		spaceType := space.Type
		if spaceType == "" {
			spaceType = "audience"
		}
		accessMode := strings.TrimSpace(space.AccessMode)
		if accessMode != "public_readonly" {
			accessMode = "private"
		}
		isDefaultPublicEntry := false
		if space.IsDefaultPublicEntry != nil {
			isDefaultPublicEntry = *space.IsDefaultPublicEntry
		}
		if accessMode != "public_readonly" {
			isDefaultPublicEntry = false
		}

		state := normalizeSpaceState(space.State)
		isProvisioned := state == "active"
		if !isProvisioned {
			isDefaultPublicEntry = false
		}
		var id int
		err = db.QueryRowContext(ctx, `
			INSERT INTO spaces (
				slug, title, space_type, access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
				visibility_groups, display_config, personalization_rules, public_entry, is_provisioned, provisioning_state
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			ON CONFLICT (slug) DO UPDATE SET
				title = EXCLUDED.title,
				space_type = EXCLUDED.space_type,
				access_mode = EXCLUDED.access_mode,
				is_default_public_entry = EXCLUDED.is_default_public_entry,
				layout_mode = EXCLUDED.layout_mode,
				background_url = EXCLUDED.background_url,
				is_lockable = EXCLUDED.is_lockable,
				visibility_groups = EXCLUDED.visibility_groups,
				display_config = EXCLUDED.display_config,
				personalization_rules = EXCLUDED.personalization_rules,
				public_entry = EXCLUDED.public_entry,
				is_provisioned = EXCLUDED.is_provisioned,
				provisioning_state = EXCLUDED.provisioning_state
			RETURNING id
		`, space.ID, space.Title, spaceType, accessMode, isDefaultPublicEntry, layout, space.BackgroundURL, lockable, groupsJSON, displayConfig, rulesConfig, publicEntryConfig, isProvisioned, state).Scan(&id)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("upsert space %s: %w", space.ID, err)
		}
		index.Declared[space.ID] = id
		if isProvisioned {
			index.Active[space.ID] = id
		}
	}
	for _, space := range spaces {
		if space.ID == "" {
			continue
		}
		var parentID sql.NullInt64
		if space.Parent != "" {
			id, ok := index.Declared[space.Parent]
			if !ok {
				return spaceSyncIndex{}, fmt.Errorf("unknown parent space %s for %s", space.Parent, space.ID)
			}
			parentID = sql.NullInt64{Int64: int64(id), Valid: true}
		}

		var templateID sql.NullInt64
		if space.DashboardTemplate != "" {
			id, err := templateIDByKey(ctx, db, space.DashboardTemplate)
			if err != nil {
				return spaceSyncIndex{}, fmt.Errorf("space %s dashboard_template: %w", space.ID, err)
			}
			if id != 0 {
				templateID = sql.NullInt64{Int64: int64(id), Valid: true}
			}
		}
		_, err := db.ExecContext(ctx, `
			UPDATE spaces
			SET parent_id = $1,
			    dashboard_template_id = $2
			WHERE slug = $3
		`, parentID, templateID, space.ID)
		if err != nil {
			return spaceSyncIndex{}, fmt.Errorf("update space %s hierarchy: %w", space.ID, err)
		}
	}
	return index, nil
}

func filterDirectoryItemsForActiveSpaces(items []DirectoryItem, index spaceSyncIndex) []DirectoryItem {
	filtered := make([]DirectoryItem, 0, len(items))
	for _, item := range items {
		if _, declared := index.Declared[item.Space]; !declared {
			filtered = append(filtered, item)
			continue
		}
		if _, active := index.Active[item.Space]; active {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func syncRoles(ctx context.Context, db *sql.DB, roles []Role) error {
	for _, role := range roles {
		if role.Key == "" {
			return fmt.Errorf("role key is required")
		}
		if role.Name == "" {
			role.Name = role.Key
		}
		perms := role.Permissions
		if len(perms) == 0 {
			perms = []string{"view"}
		}
		permsJSON, err := json.Marshal(perms)
		if err != nil {
			return fmt.Errorf("encode permissions for role %s: %w", role.Key, err)
		}
		isBuiltin := false
		if role.IsBuiltin != nil {
			isBuiltin = *role.IsBuiltin
		}
		_, err = db.ExecContext(ctx, `
			INSERT INTO roles (key, name, permissions, is_builtin)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (key) DO UPDATE SET
				name = EXCLUDED.name,
				permissions = EXCLUDED.permissions,
				is_builtin = EXCLUDED.is_builtin
		`, role.Key, role.Name, permsJSON, isBuiltin)
		if err != nil {
			return fmt.Errorf("upsert role %s: %w", role.Key, err)
		}
	}
	return nil
}

func syncDashboardTemplates(ctx context.Context, db *sql.DB, templates []Template) error {
	for _, tmpl := range templates {
		if tmpl.Key == "" {
			return fmt.Errorf("dashboard template key is required")
		}
		version := tmpl.Version
		if version == 0 {
			version = 1
		}
		blocksJSON, err := normalizeJSONArray(tmpl.Blocks)
		if err != nil {
			return fmt.Errorf("dashboard template %s blocks: %w", tmpl.Key, err)
		}
		_, err = db.ExecContext(ctx, `
			INSERT INTO dashboard_templates (key, version, blocks_json)
			VALUES ($1, $2, $3)
			ON CONFLICT (key) DO UPDATE SET
				version = EXCLUDED.version,
				blocks_json = EXCLUDED.blocks_json
		`, tmpl.Key, version, blocksJSON)
		if err != nil {
			return fmt.Errorf("upsert dashboard template %s: %w", tmpl.Key, err)
		}
	}
	return nil
}

func templateIDByKey(ctx context.Context, db *sql.DB, key string) (int, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return 0, nil
	}
	var id int
	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM dashboard_templates
		WHERE key = $1
	`, key).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}

func mergeDisplayConfigURL(raw json.RawMessage, url string) (json.RawMessage, error) {
	if strings.TrimSpace(url) == "" {
		return raw, nil
	}
	payload := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, err
		}
	}
	payload["url"] = url
	merged, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(merged), nil
}

func normalizeJSONArray(value any) (json.RawMessage, error) {
	if value == nil {
		return json.RawMessage("[]"), nil
	}
	switch typed := value.(type) {
	case json.RawMessage:
		if len(typed) == 0 {
			return json.RawMessage("[]"), nil
		}
		return typed, nil
	default:
		payload, err := json.Marshal(typed)
		if err != nil {
			return nil, err
		}
		if len(payload) == 0 || string(payload) == "null" {
			return json.RawMessage("[]"), nil
		}
		return json.RawMessage(payload), nil
	}
}

func syncDirectoryItems(ctx context.Context, db *sql.DB, items []DirectoryItem, spaceIDs map[string]int) error {
	for _, item := range items {
		if item.Key == "" {
			return fmt.Errorf("directory item key is required")
		}
		if item.Title == "" {
			item.Title = item.Key
		}
		itemType := item.Type
		if itemType == "" {
			itemType = "resource"
		}
		spaceID, ok := spaceIDs[item.Space]
		if !ok {
			return fmt.Errorf("unknown space %s for directory item %s", item.Space, item.Key)
		}
		tagsJSON, err := json.Marshal(item.Tags)
		if err != nil {
			return fmt.Errorf("encode tags for %s: %w", item.Key, err)
		}
		actionJSON, err := json.Marshal(item.ActionKeys)
		if err != nil {
			return fmt.Errorf("encode action_keys for %s: %w", item.Key, err)
		}
		audienceJSON, err := json.Marshal(item.AudienceGroups)
		if err != nil {
			return fmt.Errorf("encode audience_groups for %s: %w", item.Key, err)
		}
		ownersJSON, err := normalizeJSON(ownersWithDefault(item.Owners, itemType))
		if err != nil {
			return fmt.Errorf("encode owners for %s: %w", item.Key, err)
		}
		linksJSON, err := normalizeJSON(item.Links)
		if err != nil {
			return fmt.Errorf("encode links for %s: %w", item.Key, err)
		}
		endpointsJSON, err := normalizeJSONArray(item.Endpoints)
		if err != nil {
			return fmt.Errorf("encode endpoints for %s: %w", item.Key, err)
		}
		dependsOnJSON, err := normalizeJSONArray(item.DependsOn)
		if err != nil {
			return fmt.Errorf("encode depends_on for %s: %w", item.Key, err)
		}

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
		`, spaceID, itemType, item.Key, item.Title, item.Description, item.IconURL, item.URL, item.Pinned, tagsJSON, actionJSON, audienceJSON,
			item.ServiceType, ownersJSON, linksJSON, endpointsJSON, item.Tier, item.Lifecycle, item.AccessPath, item.RunbookURL,
			item.Classification, dependsOnJSON)
		if err != nil {
			return fmt.Errorf("upsert directory item %s: %w", item.Key, err)
		}
	}
	return nil
}

func clearMissingSpaces(ctx context.Context, db *sql.DB, spaceIDs map[string]int) error {
	list := make([]int, 0, len(spaceIDs))
	for _, id := range spaceIDs {
		list = append(list, id)
	}

	_, err := db.ExecContext(ctx, `
		UPDATE spaces
		SET is_provisioned = false,
		    provisioning_state = 'archived'
		WHERE is_provisioned = true AND (
			$1::int[] IS NULL OR array_length($1::int[], 1) IS NULL OR NOT (id = ANY($1::int[]))
		)
	`, list)
	if err != nil {
		return fmt.Errorf("clear missing spaces: %w", err)
	}
	return nil
}

func clearMissingTemplates(ctx context.Context, db *sql.DB, templates []Template) error {
	keys := make([]string, 0, len(templates))
	for _, tmpl := range templates {
		if strings.TrimSpace(tmpl.Key) != "" {
			keys = append(keys, tmpl.Key)
		}
	}
	return clearMissingTemplateKeys(ctx, db, keys)
}

func clearMissingTemplateKeys(ctx context.Context, db *sql.DB, keys []string) error {
	if len(keys) == 0 {
		_, err := db.ExecContext(ctx, `DELETE FROM dashboard_templates`)
		if err != nil {
			return fmt.Errorf("clear templates: %w", err)
		}
		return nil
	}
	placeholders := make([]string, 0, len(keys))
	args := make([]any, 0, len(keys))
	for idx, key := range keys {
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx+1))
		args = append(args, key)
	}
	query := fmt.Sprintf(`
		DELETE FROM dashboard_templates
		WHERE key NOT IN (%s)
	`, strings.Join(placeholders, ", "))
	if _, err := db.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("clear templates: %w", err)
	}
	return nil
}

func clearMissingDirectoryItems(ctx context.Context, db *sql.DB, spaceIDs map[string]int, items []DirectoryItem) error {
	itemsBySpace := map[string][]string{}
	for _, item := range items {
		if item.Space == "" || item.Key == "" {
			continue
		}
		itemsBySpace[item.Space] = append(itemsBySpace[item.Space], item.Key)
	}
	for slug, spaceID := range spaceIDs {
		keys := itemsBySpace[slug]
		if err := clearDirectoryItemsForSpace(ctx, db, spaceID, keys); err != nil {
			return err
		}
	}
	return nil
}

func clearArchivedSpaceArtifacts(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `
		DELETE FROM directory_items
		WHERE EXISTS (
			SELECT 1
			FROM spaces
			WHERE spaces.id = directory_items.space_id
			  AND spaces.is_provisioned = false
		)
	`); err != nil {
		return fmt.Errorf("clear archived space directory items: %w", err)
	}
	return nil
}

func clearDirectoryItemsForSpace(ctx context.Context, db *sql.DB, spaceID int, keys []string) error {
	if spaceID == 0 {
		return nil
	}
	if len(keys) == 0 {
		_, err := db.ExecContext(ctx, `
			DELETE FROM directory_items
			WHERE space_id = $1
		`, spaceID)
		if err != nil {
			return fmt.Errorf("clear directory items: %w", err)
		}
		return nil
	}
	placeholders := make([]string, 0, len(keys))
	args := make([]any, 0, len(keys)+1)
	args = append(args, spaceID)
	for idx, key := range keys {
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx+2))
		args = append(args, key)
	}
	query := fmt.Sprintf(`
		DELETE FROM directory_items
		WHERE space_id = $1
		  AND (key IS NULL OR key NOT IN (%s))
	`, strings.Join(placeholders, ", "))
	if _, err := db.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("clear directory items: %w", err)
	}
	return nil
}

func normalizeJSON(value any) (json.RawMessage, error) {
	if value == nil {
		return json.RawMessage("{}"), nil
	}
	switch typed := value.(type) {
	case json.RawMessage:
		if len(typed) == 0 {
			return json.RawMessage("{}"), nil
		}
		return typed, nil
	default:
		payload, err := json.Marshal(typed)
		if err != nil {
			return nil, err
		}
		if len(payload) == 0 {
			return json.RawMessage("{}"), nil
		}
		return json.RawMessage(payload), nil
	}
}

func ownersWithDefault(value any, itemType string) any {
	if itemType != "service" {
		return value
	}
	if value == nil {
		return map[string]any{"team": "admin"}
	}
	switch typed := value.(type) {
	case map[string]any:
		if len(typed) == 0 {
			return map[string]any{"team": "admin"}
		}
	case map[string]string:
		if len(typed) == 0 {
			return map[string]any{"team": "admin"}
		}
	case map[any]any:
		if len(typed) == 0 {
			return map[string]any{"team": "admin"}
		}
	}
	return value
}

func DefaultPath() string {
	return "/etc/atrium/provisioning.yaml"
}

func ParseArchiveFlag(value string) bool {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return true
	}
	return value == "1" || value == "true" || value == "yes"
}

func normalizeSpaceState(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "active":
		return "active"
	case "archived":
		return "archived"
	default:
		return "archived"
	}
}
