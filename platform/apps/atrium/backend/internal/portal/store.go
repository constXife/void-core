package portal

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"atrium/internal/auth"
)

type templateRecord struct {
	ID      int
	Key     string
	Version int
	Blocks  json.RawMessage
}

func isGuestViewer(session auth.Session, role string) bool {
	if strings.TrimSpace(session.Email) == "" {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(role), "guest")
}

func canViewPublicSpace(session auth.Session, role string, space SpaceSummary) bool {
	return strings.EqualFold(space.AccessMode, "public_readonly")
}

func filterGuestBlocks(blocks json.RawMessage) json.RawMessage {
	var parsed []map[string]any
	if err := json.Unmarshal(blocks, &parsed); err != nil {
		return json.RawMessage("[]")
	}
	output := make([]map[string]any, 0, len(parsed))
	for _, block := range parsed {
		if block == nil {
			continue
		}
		blockType := ""
		if value, ok := block["type"].(string); ok {
			blockType = normalizeBlockType(value)
		}
		if isGuestSafeBlockType(blockType) {
			output = append(output, block)
		}
	}
	raw, err := json.Marshal(output)
	if err != nil {
		return json.RawMessage("[]")
	}
	return raw
}

func isGuestSafeBlockType(value string) bool {
	switch normalizeBlockType(value) {
	case "resources_pinned", "text":
		return true
	default:
		return false
	}
}

func LoadDashboard(ctx context.Context, db *sql.DB, spaceID int, session auth.Session) (DashboardPayload, error) {
	space, err := loadSpace(ctx, db, spaceID)
	if err != nil {
		return DashboardPayload{}, err
	}

	role, _ := auth.EffectiveRole(ctx, session)
	userID, _ := userIDByEmail(ctx, db, session.Email)
	if canViewPublicSpace(session, role, space) {
		templateKey, sharedKey := resolveTemplateKeys(space.Slug, space.DisplayConfig)
		parentBlocks, _ := loadParentTemplate(ctx, db, space, sharedKey)
		childBlocks, _ := loadTemplateForSpace(ctx, db, space, templateKey)
		mergedBlocks := filterGuestBlocks(mergeBlocks(parentBlocks, childBlocks))
		prefs := loadPreferences(ctx, db, userID, spaceID)
		return DashboardPayload{
			Space: space,
			Template: TemplatePayload{
				ID:      childBlocks.ID,
				Key:     childBlocks.Key,
				Version: childBlocks.Version,
				Blocks:  mergedBlocks,
			},
			Preferences: prefs,
			MobileOrder: prefs.BlockOrder,
		}, nil
	}
	if err := ensureMembership(ctx, db, userID, spaceID, role); err != nil {
		return DashboardPayload{}, err
	}

	templateKey, sharedKey := resolveTemplateKeys(space.Slug, space.DisplayConfig)
	parentBlocks, _ := loadParentTemplate(ctx, db, space, sharedKey)
	childBlocks, _ := loadTemplateForSpace(ctx, db, space, templateKey)
	mergedBlocks := mergeBlocks(parentBlocks, childBlocks)

	prefs := loadPreferences(ctx, db, userID, spaceID)

	return DashboardPayload{
		Space: space,
		Template: TemplatePayload{
			ID:      childBlocks.ID,
			Key:     childBlocks.Key,
			Version: childBlocks.Version,
			Blocks:  mergedBlocks,
		},
		Preferences: prefs,
		MobileOrder: prefs.BlockOrder,
	}, nil
}

func SaveDashboard(ctx context.Context, db *sql.DB, spaceID int, session auth.Session, input DashboardSaveInput) (DashboardPayload, error) {
	space, err := loadSpace(ctx, db, spaceID)
	if err != nil {
		return DashboardPayload{}, err
	}

	role, isAdmin := auth.EffectiveRole(ctx, session)
	userID, _ := userIDByEmail(ctx, db, session.Email)
	if err := ensureMembership(ctx, db, userID, spaceID, role); err != nil {
		return DashboardPayload{}, err
	}

	templateKey, _ := resolveTemplateKeys(space.Slug, space.DisplayConfig)
	templateRecord := templateRecord{Key: templateKey}
	if space.DashboardTemplateID != nil && *space.DashboardTemplateID > 0 {
		if loaded, err := loadTemplateByID(ctx, db, *space.DashboardTemplateID); err == nil {
			templateRecord = loaded
		}
	}
	if templateRecord.Key == "" {
		templateRecord.Key = templateKey
	}
	if len(input.Blocks) > 0 {
		if !isAdmin {
			return DashboardPayload{}, fmt.Errorf("admin role required")
		}
		if err := upsertTemplate(ctx, db, templateRecord.Key, input.Blocks); err != nil {
			return DashboardPayload{}, err
		}
	}

	if userID != "" && (len(input.HiddenBlockIDs) > 0 || len(input.BlockOrder) > 0) {
		if err := upsertPreferences(ctx, db, userID, spaceID, input); err != nil {
			return DashboardPayload{}, err
		}
	}

	return LoadDashboard(ctx, db, spaceID, session)
}

func LoadBlocksData(ctx context.Context, db *sql.DB, spaceID int, session auth.Session, blocks []BlockDescriptor) (map[string]any, error) {
	space, err := loadSpace(ctx, db, spaceID)
	if err != nil {
		return nil, err
	}

	role, isAdmin := auth.EffectiveRole(ctx, session)
	userID, _ := userIDByEmail(ctx, db, session.Email)
	if strings.EqualFold(space.AccessMode, "public_readonly") {
		isAdmin = false
		role = "guest"
	} else if err := ensureMembership(ctx, db, userID, spaceID, role); err != nil {
		return nil, err
	}

	scopeIDs := spaceScopeIDs(ctx, db, spaceID)
	if strings.EqualFold(space.AccessMode, "public_readonly") {
		scopeIDs = []int{spaceID}
	}

	response := make(map[string]any, len(blocks))
	for _, block := range blocks {
		normalizedType := normalizeBlockType(block.Type)
		if strings.EqualFold(space.AccessMode, "public_readonly") && !isGuestSafeBlockType(normalizedType) {
			continue
		}
		switch normalizedType {
		case "resources_pinned":
			items, err := loadPinnedDirectory(ctx, db, scopeIDs, 20, role, isAdmin, strings.EqualFold(space.AccessMode, "public_readonly"))
			if err != nil {
				return nil, err
			}
			response[block.ID] = items
		default:
			if strings.EqualFold(space.AccessMode, "public_readonly") {
				continue
			}
			response[block.ID] = map[string]any{}
		}
	}
	return response, nil
}

func normalizeBlockType(value string) string {
	raw := strings.TrimSpace(strings.ToLower(value))
	switch raw {
	case "resources_pinned", "core.resources_pinned":
		return "resources_pinned"
	default:
		return raw
	}
}

func InvokeAction(ctx context.Context, db *sql.DB, input ActionInvokeInput, session auth.Session) (ActionInvokeResult, error) {
	if strings.TrimSpace(input.ActionKey) == "" {
		return ActionInvokeResult{}, fmt.Errorf("action_key is required")
	}

	role, _ := auth.EffectiveRole(ctx, session)
	if isGuestViewer(session, role) {
		return ActionInvokeResult{}, fmt.Errorf("forbidden")
	}
	userID, _ := userIDByEmail(ctx, db, session.Email)
	spaceIDValue := sql.NullInt64{}
	if input.SpaceID != nil && *input.SpaceID > 0 {
		space, err := loadSpace(ctx, db, *input.SpaceID)
		if err != nil {
			return ActionInvokeResult{}, err
		}
		if strings.EqualFold(space.AccessMode, "public_readonly") {
			return ActionInvokeResult{}, fmt.Errorf("forbidden")
		}
		if err := ensureMembership(ctx, db, userID, *input.SpaceID, role); err != nil {
			return ActionInvokeResult{}, err
		}
		spaceIDValue = sql.NullInt64{Int64: int64(*input.SpaceID), Valid: true}
	}

	var unitID *int
	if session.StayID != "" {
		if value, err := unitIDByStay(ctx, db, session.StayID); err == nil && value != 0 {
			unitID = &value
		}
	}

	payload := map[string]any{
		"action_key": input.ActionKey,
		"params":     input.Params,
	}
	if unitID != nil {
		payload["unit_id"] = *unitID
	}
	if session.StayID != "" {
		payload["stay_id"] = session.StayID
	}
	payloadJSON, _ := json.Marshal(payload)
	entityJSON, _ := json.Marshal(map[string]any{"action_key": input.ActionKey})

	var auditID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO activity_events (space_id, actor_id, type, entity_ref, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, spaceIDValue, nullableUUID(userID), "action_invoked", entityJSON, payloadJSON, time.Now()).Scan(&auditID)
	if err != nil {
		return ActionInvokeResult{}, fmt.Errorf("audit action: %w", err)
	}

	return ActionInvokeResult{
		Status:  "ok",
		AuditID: auditID,
	}, nil
}

func ListTemplates(ctx context.Context, db *sql.DB) ([]TemplateSummary, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, key, version
		FROM dashboard_templates
		ORDER BY key
	`)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	defer rows.Close()

	var items []TemplateSummary
	for rows.Next() {
		var item TemplateSummary
		if err := rows.Scan(&item.ID, &item.Key, &item.Version); err != nil {
			return nil, fmt.Errorf("scan template: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate templates: %w", err)
	}
	return items, nil
}

func loadSpace(ctx context.Context, db *sql.DB, spaceID int) (SpaceSummary, error) {
	var item SpaceSummary
	var background sql.NullString
	var groups []byte
	var cfg []byte
	var rules []byte
	var publicEntry []byte
	var parentID sql.NullInt64
	var templateID sql.NullInt64
	err := db.QueryRowContext(ctx, `
		SELECT id, title, slug, space_type, parent_id, dashboard_template_id,
		       access_mode, is_default_public_entry, layout_mode, background_url, is_lockable,
		       visibility_groups, display_config, personalization_rules, public_entry
		FROM spaces
		WHERE id = $1 AND is_provisioned = true
	`, spaceID).Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.Type,
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
	)
	if err != nil {
		return SpaceSummary{}, fmt.Errorf("load space: %w", err)
	}
	item.BackgroundURL = background.String
	if item.Type == "" {
		item.Type = "audience"
	}
	item.AccessMode = normalizeAccessMode(item.AccessMode)
	item.DisplayConfig = normalizeJSON(cfg, "{}")
	item.VisibilityGroups = normalizeJSON(groups, "[]")
	item.PersonalizationRules = normalizeJSON(rules, "{}")
	item.PublicEntry = normalizeJSON(publicEntry, "{}")
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

func loadTemplateBlocks(ctx context.Context, db *sql.DB, key string) (templateRecord, error) {
	if key == "" {
		return templateRecord{Key: key, Blocks: json.RawMessage("[]")}, nil
	}

	var rec templateRecord
	var blocks []byte
	err := db.QueryRowContext(ctx, `
		SELECT id, key, version, blocks_json
		FROM dashboard_templates
		WHERE key = $1
	`, key).Scan(&rec.ID, &rec.Key, &rec.Version, &blocks)
	if err != nil {
		if err == sql.ErrNoRows {
			return templateRecord{Key: key, Blocks: json.RawMessage("[]")}, nil
		}
		return templateRecord{}, fmt.Errorf("load template: %w", err)
	}
	rec.Blocks = normalizeJSON(blocks, "[]")
	return rec, nil
}

func loadTemplateByID(ctx context.Context, db *sql.DB, id int) (templateRecord, error) {
	if id == 0 {
		return templateRecord{}, sql.ErrNoRows
	}
	var rec templateRecord
	var blocks []byte
	err := db.QueryRowContext(ctx, `
		SELECT id, key, version, blocks_json
		FROM dashboard_templates
		WHERE id = $1
	`, id).Scan(&rec.ID, &rec.Key, &rec.Version, &blocks)
	if err != nil {
		if err == sql.ErrNoRows {
			return templateRecord{}, err
		}
		return templateRecord{}, fmt.Errorf("load template: %w", err)
	}
	rec.Blocks = normalizeJSON(blocks, "[]")
	return rec, nil
}

func TemplateKeyByID(ctx context.Context, db *sql.DB, id int) (string, error) {
	if id == 0 {
		return "", fmt.Errorf("template id is required")
	}
	var key string
	if err := db.QueryRowContext(ctx, `
		SELECT key
		FROM dashboard_templates
		WHERE id = $1
	`, id).Scan(&key); err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", fmt.Errorf("load template key: %w", err)
	}
	return key, nil
}

func loadTemplateForSpace(ctx context.Context, db *sql.DB, space SpaceSummary, fallbackKey string) (templateRecord, error) {
	if space.DashboardTemplateID != nil && *space.DashboardTemplateID > 0 {
		if rec, err := loadTemplateByID(ctx, db, *space.DashboardTemplateID); err == nil {
			return rec, nil
		}
	}
	return loadTemplateBlocks(ctx, db, fallbackKey)
}

func loadParentTemplate(ctx context.Context, db *sql.DB, space SpaceSummary, fallbackKey string) (templateRecord, error) {
	if space.ParentID != nil && *space.ParentID > 0 {
		parent, err := loadSpace(ctx, db, *space.ParentID)
		if err == nil {
			parentKey, _ := resolveTemplateKeys(parent.Slug, parent.DisplayConfig)
			return loadTemplateForSpace(ctx, db, parent, parentKey)
		}
	}
	return loadTemplateBlocks(ctx, db, fallbackKey)
}

func resolveTemplateKeys(slug string, displayConfig json.RawMessage) (string, string) {
	templateKey := slug
	sharedKey := ""

	if len(displayConfig) > 0 {
		var payload map[string]any
		if err := json.Unmarshal(displayConfig, &payload); err == nil {
			if value, ok := payload["dashboard_template_key"].(string); ok && value != "" {
				templateKey = value
			}
			if value, ok := payload["shared_template_key"].(string); ok && value != "" {
				sharedKey = value
			}
		}
	}

	if sharedKey == "" {
		if idx := strings.Index(slug, "-"); idx > 0 {
			sharedKey = slug[:idx] + "-shared"
		}
	}

	if sharedKey == templateKey {
		sharedKey = ""
	}
	return templateKey, sharedKey
}

func mergeBlocks(parent templateRecord, child templateRecord) json.RawMessage {
	var parentBlocks []map[string]any
	_ = json.Unmarshal(parent.Blocks, &parentBlocks)
	var childBlocks []map[string]any
	_ = json.Unmarshal(child.Blocks, &childBlocks)

	order := make([]string, 0, len(parentBlocks)+len(childBlocks))
	store := make(map[string]map[string]any)

	appendBlock := func(block map[string]any) {
		rawID, ok := block["id"].(string)
		if !ok || rawID == "" {
			anonID := fmt.Sprintf("anon-%d", len(order)+1)
			order = append(order, anonID)
			store[anonID] = block
			return
		}
		if _, exists := store[rawID]; !exists {
			order = append(order, rawID)
		}
		store[rawID] = block
	}

	for _, block := range parentBlocks {
		appendBlock(block)
	}
	for _, block := range childBlocks {
		appendBlock(block)
	}

	output := make([]map[string]any, 0, len(order))
	for _, key := range order {
		if block, ok := store[key]; ok {
			output = append(output, block)
		}
	}
	raw, err := json.Marshal(output)
	if err != nil {
		return json.RawMessage("[]")
	}
	return raw
}

func loadPreferences(ctx context.Context, db *sql.DB, userID string, spaceID int) PreferencesPayload {
	if userID == "" {
		return PreferencesPayload{
			HiddenBlockIDs: json.RawMessage("[]"),
			BlockOrder:     json.RawMessage("[]"),
		}
	}

	var hidden []byte
	var order []byte
	err := db.QueryRowContext(ctx, `
		SELECT hidden_block_ids, block_order
		FROM user_preferences
		WHERE principal_id = $1 AND space_id = $2
	`, userID, spaceID).Scan(&hidden, &order)
	if err != nil {
		return PreferencesPayload{
			HiddenBlockIDs: json.RawMessage("[]"),
			BlockOrder:     json.RawMessage("[]"),
		}
	}

	return PreferencesPayload{
		HiddenBlockIDs: normalizeJSON(hidden, "[]"),
		BlockOrder:     normalizeJSON(order, "[]"),
	}
}

func upsertTemplate(ctx context.Context, db *sql.DB, key string, blocks json.RawMessage) error {
	if key == "" {
		return fmt.Errorf("template key is required")
	}
	blocks = normalizeJSON(blocks, "[]")
	_, err := db.ExecContext(ctx, `
		INSERT INTO dashboard_templates (key, version, blocks_json, created_at)
		VALUES ($1, 1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET
			version = dashboard_templates.version + 1,
			blocks_json = EXCLUDED.blocks_json
	`, key, blocks)
	if err != nil {
		return fmt.Errorf("upsert template: %w", err)
	}
	return nil
}

func upsertPreferences(ctx context.Context, db *sql.DB, userID string, spaceID int, input DashboardSaveInput) error {
	hidden := normalizeJSON(input.HiddenBlockIDs, "[]")
	order := normalizeJSON(input.BlockOrder, "[]")
	_, err := db.ExecContext(ctx, `
		INSERT INTO user_preferences (principal_id, space_id, hidden_block_ids, block_order)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (principal_id, space_id) DO UPDATE SET
			hidden_block_ids = EXCLUDED.hidden_block_ids,
			block_order = EXCLUDED.block_order
	`, userID, spaceID, hidden, order)
	if err != nil {
		return fmt.Errorf("upsert preferences: %w", err)
	}
	return nil
}

func ensureMembership(ctx context.Context, db *sql.DB, userID string, spaceID int, role string) error {
	if role == "admin" {
		return nil
	}
	if userID == "" {
		return fmt.Errorf("authentication required")
	}

	var count int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(1)
		FROM memberships
		WHERE principal_id = $1 AND space_id = $2
	`, userID, spaceID).Scan(&count)
	if err != nil {
		return fmt.Errorf("check membership: %w", err)
	}
	if count == 0 {
		var spaceCount int
		if err := db.QueryRowContext(ctx, `
			SELECT COUNT(1)
			FROM memberships
			WHERE space_id = $1
		`, spaceID).Scan(&spaceCount); err != nil {
			return fmt.Errorf("check space membership: %w", err)
		}
		if spaceCount > 0 {
			return fmt.Errorf("membership required")
		}
	}
	return nil
}

func userIDByEmail(ctx context.Context, db *sql.DB, email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return "", fmt.Errorf("email is required")
	}
	var id string
	err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func unitIDByStay(ctx context.Context, db *sql.DB, stayID string) (int, error) {
	var unitID int
	err := db.QueryRowContext(ctx, `
		SELECT unit_id
		FROM stays
		WHERE id = $1
	`, stayID).Scan(&unitID)
	if err != nil {
		return 0, err
	}
	return unitID, nil
}

func loadPinnedDirectory(ctx context.Context, db *sql.DB, spaceIDs []int, limit int, role string, isAdmin bool, publicLayer bool) ([]map[string]any, error) {
	where, args := buildSpaceFilter(spaceIDs, 1)
	if !isAdmin {
		audienceWhere, audienceArgs := buildAudienceFilter(role, len(args)+1)
		if publicLayer {
			audienceWhere, audienceArgs = buildGuestAudienceFilter(len(args) + 1)
		}
		where = fmt.Sprintf("(%s) AND (%s)", where, audienceWhere)
		args = append(args, audienceArgs...)
	}
	args = append(args, limit)
	query := fmt.Sprintf(`
		SELECT id, space_id, type, key, title, description, icon_url, url, pinned,
		       tags, action_keys, service_type, owners_json, links_json, endpoints_json,
		       tier, lifecycle, access_path, runbook_url, classification, depends_on_json, created_at
		FROM directory_items
		WHERE %s AND pinned = true
		ORDER BY created_at DESC
		LIMIT $%d
	`, where, len(args))
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list directory: %w", err)
	}
	defer rows.Close()

	var items []map[string]any
	for rows.Next() {
		var (
			id             string
			spaceID        int
			itemType       string
			key            sql.NullString
			title          string
			desc           sql.NullString
			icon           sql.NullString
			url            sql.NullString
			pinned         bool
			tags           []byte
			actions        []byte
			serviceType    sql.NullString
			owners         []byte
			links          []byte
			endpoints      []byte
			tier           sql.NullString
			lifecycle      sql.NullString
			accessPath     sql.NullString
			runbookURL     sql.NullString
			classification sql.NullString
			dependsOn      []byte
			createdAt      time.Time
		)
		if err := rows.Scan(
			&id, &spaceID, &itemType, &key, &title, &desc, &icon, &url, &pinned,
			&tags, &actions, &serviceType, &owners, &links, &endpoints,
			&tier, &lifecycle, &accessPath, &runbookURL, &classification, &dependsOn, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan directory item: %w", err)
		}
		items = append(items, map[string]any{
			"id":          id,
			"space_id":    spaceID,
			"type":        itemType,
			"key":         key.String,
			"title":       title,
			"description": desc.String,
			"icon_url":    icon.String,
			"url":         url.String,
			"pinned":      pinned,
			"tags":        json.RawMessage(normalizeJSON(tags, "[]")),
			"created_at":  createdAt,
		})
		if !publicLayer {
			items[len(items)-1]["action_keys"] = json.RawMessage(normalizeJSON(actions, "[]"))
			items[len(items)-1]["service_type"] = serviceType.String
			items[len(items)-1]["owners"] = json.RawMessage(normalizeJSON(owners, "{}"))
			items[len(items)-1]["links"] = json.RawMessage(normalizeJSON(links, "{}"))
			items[len(items)-1]["endpoints"] = json.RawMessage(normalizeJSON(endpoints, "[]"))
			items[len(items)-1]["tier"] = tier.String
			items[len(items)-1]["lifecycle"] = lifecycle.String
			items[len(items)-1]["access_path"] = accessPath.String
			items[len(items)-1]["runbook_url"] = runbookURL.String
			items[len(items)-1]["classification"] = classification.String
			items[len(items)-1]["depends_on"] = json.RawMessage(normalizeJSON(dependsOn, "[]"))
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate directory: %w", err)
	}
	return items, nil
}

func spaceScopeIDs(ctx context.Context, db *sql.DB, spaceID int) []int {
	if spaceID == 0 {
		return []int{}
	}
	ids := []int{}
	seen := map[int]struct{}{}
	current := spaceID
	for i := 0; i < 8 && current != 0; i++ {
		if _, ok := seen[current]; ok {
			break
		}
		seen[current] = struct{}{}
		ids = append(ids, current)

		parent, err := loadSpace(ctx, db, current)
		if err != nil || parent.ParentID == nil || *parent.ParentID == 0 {
			break
		}
		current = *parent.ParentID
	}
	return ids
}

func buildSpaceFilter(spaceIDs []int, startIndex int) (string, []any) {
	if len(spaceIDs) == 0 {
		return "1=0", []any{}
	}
	placeholders := make([]string, 0, len(spaceIDs))
	args := make([]any, 0, len(spaceIDs))
	for i, id := range spaceIDs {
		placeholders = append(placeholders, fmt.Sprintf("$%d", startIndex+i))
		args = append(args, id)
	}
	return fmt.Sprintf("space_id IN (%s)", strings.Join(placeholders, ",")), args
}

func buildAudienceFilter(role string, startIndex int) (string, []any) {
	if role == "" {
		role = "guest"
	}
	return fmt.Sprintf("(jsonb_array_length(audience_groups) = 0 OR audience_groups ? $%d OR audience_groups ? '*')", startIndex), []any{role}
}

func buildGuestAudienceFilter(startIndex int) (string, []any) {
	return fmt.Sprintf("(audience_groups ? $%d OR audience_groups ? $%d OR audience_groups ? '*')", startIndex, startIndex+1), []any{"guest", "public"}
}

func normalizeJSON(value []byte, fallback string) json.RawMessage {
	if len(value) == 0 {
		return json.RawMessage(fallback)
	}
	return json.RawMessage(value)
}

func normalizeAccessMode(value string) string {
	if strings.TrimSpace(value) == "public_readonly" {
		return "public_readonly"
	}
	return "private"
}

func nullableUUID(value string) sql.NullString {
	if strings.TrimSpace(value) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}
