package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"atrium/internal/auth"
	"atrium/internal/configstore"
	"atrium/internal/directory"
	"atrium/internal/portal"
	"atrium/internal/provisioning"
	"atrium/internal/spaces"
)

type configFirstDeps struct {
	db                   *sql.DB
	store                *configstore.ProvisioningStore
	reload               func(ctx context.Context) error
	keepTemplateOnRename bool
}

func (c configFirstDeps) CreateCategory(ctx context.Context, input spaces.Input) (spaces.Space, error) {
	if input.Title == "" || input.Slug == "" {
		return spaces.Space{}, fmt.Errorf("title and slug are required")
	}
	space, err := c.spaceFromInput(ctx, input, "")
	if err != nil {
		return spaces.Space{}, err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		if findSpaceIndex(file.Spaces, input.Slug) >= 0 {
			return fmt.Errorf("space %s already exists", input.Slug)
		}
		file.Spaces = append(file.Spaces, space)
		return nil
	}); err != nil {
		return spaces.Space{}, err
	}
	if err := c.reload(ctx); err != nil {
		return spaces.Space{}, err
	}
	return spaces.GetBySlug(ctx, c.db, input.Slug)
}

func (c configFirstDeps) UpdateCategory(ctx context.Context, id int, input spaces.Input) (spaces.Space, error) {
	if input.Title == "" || input.Slug == "" {
		return spaces.Space{}, fmt.Errorf("title and slug are required")
	}
	existing, err := spaces.Get(ctx, c.db, id)
	if err != nil {
		return spaces.Space{}, err
	}
	space, err := c.spaceFromInput(ctx, input, existing.Slug)
	if err != nil {
		return spaces.Space{}, err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findSpaceIndex(file.Spaces, existing.Slug)
		if idx < 0 {
			return fmt.Errorf("space %s not found in provisioning", existing.Slug)
		}
		file.Spaces[idx] = space
		if existing.Slug != input.Slug {
			updateSpaceReferences(file, existing.Slug, input.Slug)
		}
		return nil
	}); err != nil {
		return spaces.Space{}, err
	}
	if err := c.reload(ctx); err != nil {
		return spaces.Space{}, err
	}
	return spaces.GetBySlug(ctx, c.db, input.Slug)
}

func (c configFirstDeps) DeleteCategory(ctx context.Context, id int) error {
	existing, err := spaces.GetAny(ctx, c.db, id)
	if err != nil {
		return err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findSpaceIndex(file.Spaces, existing.Slug)
		if idx < 0 {
			return fmt.Errorf("space %s not found in provisioning", existing.Slug)
		}
		file.Spaces = append(file.Spaces[:idx], file.Spaces[idx+1:]...)
		removeDirectoryItemsForSpace(file, existing.Slug)
		clearParentReferences(file, existing.Slug)
		return nil
	}); err != nil {
		return err
	}
	return c.reload(ctx)
}

func (c configFirstDeps) ArchiveCategory(ctx context.Context, id int) error {
	existing, err := spaces.GetAny(ctx, c.db, id)
	if err != nil {
		return err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findSpaceIndex(file.Spaces, existing.Slug)
		if idx < 0 {
			return fmt.Errorf("space %s not found in provisioning", existing.Slug)
		}
		file.Spaces[idx].State = "archived"
		return nil
	}); err != nil {
		return err
	}
	return c.reload(ctx)
}

func (c configFirstDeps) RestoreCategory(ctx context.Context, id int) error {
	existing, err := spaces.GetAny(ctx, c.db, id)
	if err != nil {
		return err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findSpaceIndex(file.Spaces, existing.Slug)
		if idx < 0 {
			return fmt.Errorf("space %s not found in provisioning", existing.Slug)
		}
		file.Spaces[idx].State = "active"
		return nil
	}); err != nil {
		return err
	}
	return c.reload(ctx)
}

func (c configFirstDeps) CreateDirectory(ctx context.Context, input directory.CreateInput) (directory.Item, error) {
	if input.SpaceID == 0 {
		return directory.Item{}, fmt.Errorf("space_id is required")
	}
	if strings.TrimSpace(input.Title) == "" {
		return directory.Item{}, fmt.Errorf("title is required")
	}
	space, err := spaces.Get(ctx, c.db, input.SpaceID)
	if err != nil {
		return directory.Item{}, err
	}
	item := provisioningDirectoryItem(space, input, "")
	if err := c.store.Update(func(file *provisioning.File) error {
		if findDirectoryIndex(file.DirectoryItems, item.Space, item.Key) >= 0 {
			return fmt.Errorf("directory item %s already exists", item.Key)
		}
		file.DirectoryItems = append(file.DirectoryItems, item)
		return nil
	}); err != nil {
		return directory.Item{}, err
	}
	if err := c.reload(ctx); err != nil {
		return directory.Item{}, err
	}
	return directory.GetByKey(ctx, c.db, input.SpaceID, item.Key)
}

func (c configFirstDeps) UpdateDirectory(ctx context.Context, id string, input directory.UpdateInput) (directory.Item, error) {
	if strings.TrimSpace(input.Title) == "" {
		return directory.Item{}, fmt.Errorf("title is required")
	}
	existing, err := directory.Get(ctx, c.db, id)
	if err != nil {
		return directory.Item{}, err
	}
	space, err := spaces.Get(ctx, c.db, existing.SpaceID)
	if err != nil {
		return directory.Item{}, err
	}
	item := provisioningDirectoryItem(space, directory.CreateInput{
		SpaceID:        existing.SpaceID,
		Type:           input.Type,
		Key:            input.Key,
		Title:          input.Title,
		Description:    input.Description,
		IconURL:        input.IconURL,
		URL:            input.URL,
		Pinned:         input.Pinned,
		Tags:           input.Tags,
		ActionKeys:     input.ActionKeys,
		AudienceGroups: input.AudienceGroups,
	}, existing.Key)

	if err := c.store.Update(func(file *provisioning.File) error {
		lookupKey := existing.Key
		if lookupKey == "" {
			lookupKey = strings.TrimSpace(input.Key)
		}
		idx := findDirectoryIndex(file.DirectoryItems, space.Slug, lookupKey)
		if idx < 0 {
			return fmt.Errorf("directory item %s not found in provisioning", lookupKey)
		}
		file.DirectoryItems[idx] = item
		return nil
	}); err != nil {
		return directory.Item{}, err
	}
	if err := c.reload(ctx); err != nil {
		return directory.Item{}, err
	}
	return directory.Get(ctx, c.db, id)
}

func (c configFirstDeps) DeleteDirectory(ctx context.Context, id string) error {
	existing, err := directory.Get(ctx, c.db, id)
	if err != nil {
		return err
	}
	space, err := spaces.Get(ctx, c.db, existing.SpaceID)
	if err != nil {
		return err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findDirectoryIndex(file.DirectoryItems, space.Slug, existing.Key)
		if idx < 0 {
			return fmt.Errorf("directory item %s not found in provisioning", existing.Key)
		}
		file.DirectoryItems = append(file.DirectoryItems[:idx], file.DirectoryItems[idx+1:]...)
		return nil
	}); err != nil {
		return err
	}
	return c.reload(ctx)
}

func (c configFirstDeps) SaveDashboard(ctx context.Context, spaceID int, session auth.Session, input portal.DashboardSaveInput) (portal.DashboardPayload, error) {
	if len(input.Blocks) == 0 {
		return portal.SaveDashboard(ctx, c.db, spaceID, session, input)
	}
	if session.Role != "admin" {
		return portal.DashboardPayload{}, fmt.Errorf("admin role required")
	}
	payload, err := portal.LoadDashboard(ctx, c.db, spaceID, session)
	if err != nil {
		return portal.DashboardPayload{}, err
	}
	templateKey := strings.TrimSpace(payload.Template.Key)
	if templateKey == "" {
		return portal.DashboardPayload{}, fmt.Errorf("template key is required")
	}
	blocksPayload, err := decodeBlocks(input.Blocks)
	if err != nil {
		return portal.DashboardPayload{}, err
	}
	if err := c.store.Update(func(file *provisioning.File) error {
		idx := findTemplateIndex(file.Templates, templateKey)
		if idx < 0 {
			file.Templates = append(file.Templates, provisioning.Template{
				Key:     templateKey,
				Version: 1,
				Blocks:  blocksPayload,
			})
			return nil
		}
		file.Templates[idx].Blocks = blocksPayload
		if file.Templates[idx].Version == 0 {
			file.Templates[idx].Version = 1
		} else {
			file.Templates[idx].Version++
		}
		return nil
	}); err != nil {
		return portal.DashboardPayload{}, err
	}
	if err := c.reload(ctx); err != nil {
		return portal.DashboardPayload{}, err
	}
	prefsInput := input
	prefsInput.Blocks = nil
	return portal.SaveDashboard(ctx, c.db, spaceID, session, prefsInput)
}

func (c configFirstDeps) spaceFromInput(ctx context.Context, input spaces.Input, priorSlug string) (provisioning.Space, error) {
	layout := strings.TrimSpace(input.LayoutMode)
	if layout == "" {
		layout = "grid"
	}
	spaceType := strings.TrimSpace(input.Type)
	if spaceType == "" {
		spaceType = "audience"
	}
	isLockable := true
	if input.IsLockable != nil {
		isLockable = *input.IsLockable
	}
	parentSlug := ""
	if input.ParentID != nil && *input.ParentID > 0 {
		parent, err := spaces.Get(ctx, c.db, *input.ParentID)
		if err != nil {
			return provisioning.Space{}, err
		}
		parentSlug = parent.Slug
	}
	templateKey := ""
	if input.DashboardTemplateID != nil && *input.DashboardTemplateID > 0 {
		key, err := portal.TemplateKeyByID(ctx, c.db, *input.DashboardTemplateID)
		if err != nil {
			return provisioning.Space{}, err
		}
		templateKey = key
	}
	if c.keepTemplateOnRename && templateKey == "" && priorSlug != "" && priorSlug != input.Slug {
		templateKey = priorSlug
	}

	return provisioning.Space{
		ID:                   input.Slug,
		Title:                input.Title,
		State:                "active",
		Type:                 spaceType,
		Parent:               parentSlug,
		DashboardTemplate:    templateKey,
		LayoutMode:           layout,
		BackgroundURL:        input.BackgroundURL,
		IsLockable:           &isLockable,
		VisibilityGroups:     decodeStringSlice(input.VisibilityGroups),
		DisplayConfig:        configstore.DecodeJSON(input.DisplayConfig, map[string]any{}),
		PersonalizationRules: configstore.DecodeJSON(input.PersonalizationRules, map[string]any{}),
	}, nil
}

func provisioningDirectoryItem(space spaces.Space, input directory.CreateInput, fallbackKey string) provisioning.DirectoryItem {
	key := strings.TrimSpace(input.Key)
	if key == "" {
		key = strings.TrimSpace(fallbackKey)
	}
	if key == "" {
		key = strings.TrimSpace(input.Title)
	}
	itemType := strings.TrimSpace(input.Type)
	if itemType == "" {
		itemType = "resource"
	}
	audience := input.AudienceGroups
	if len(audience) == 0 {
		audience = decodeStringSlice(space.VisibilityGroups)
	}
	return provisioning.DirectoryItem{
		Key:            key,
		Title:          input.Title,
		Description:    input.Description,
		IconURL:        input.IconURL,
		URL:            input.URL,
		Type:           itemType,
		Space:          space.Slug,
		Pinned:         input.Pinned,
		Tags:           input.Tags,
		ActionKeys:     input.ActionKeys,
		AudienceGroups: audience,
		ServiceType:    input.ServiceType,
		Owners:         configstore.DecodeJSON(input.Owners, map[string]any{}),
		Links:          configstore.DecodeJSON(input.Links, map[string]any{}),
		Endpoints:      configstore.DecodeJSON(input.Endpoints, []any{}),
		Tier:           input.Tier,
		Lifecycle:      input.Lifecycle,
		AccessPath:     input.AccessPath,
		RunbookURL:     input.RunbookURL,
		Classification: input.Classification,
		DependsOn:      configstore.DecodeJSON(input.DependsOn, []any{}),
	}
}

func decodeStringSlice(raw json.RawMessage) []string {
	value := configstore.DecodeJSON(raw, []string{})
	if list, ok := value.([]any); ok {
		out := make([]string, 0, len(list))
		for _, item := range list {
			if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
				out = append(out, text)
			}
		}
		return out
	}
	if list, ok := value.([]string); ok {
		return list
	}
	return []string{}
}

func decodeBlocks(raw json.RawMessage) (any, error) {
	if len(raw) == 0 {
		return []map[string]any{}, nil
	}
	var payload any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, fmt.Errorf("invalid blocks payload: %w", err)
	}
	return payload, nil
}

func findSpaceIndex(spaces []provisioning.Space, slug string) int {
	for idx, item := range spaces {
		if item.ID == slug {
			return idx
		}
	}
	return -1
}

func findDirectoryIndex(items []provisioning.DirectoryItem, spaceSlug string, key string) int {
	for idx, item := range items {
		if item.Space == spaceSlug && item.Key == key {
			return idx
		}
	}
	return -1
}

func findTemplateIndex(items []provisioning.Template, key string) int {
	for idx, item := range items {
		if item.Key == key {
			return idx
		}
	}
	return -1
}

func updateSpaceReferences(file *provisioning.File, oldSlug, newSlug string) {
	for idx := range file.Spaces {
		if file.Spaces[idx].Parent == oldSlug {
			file.Spaces[idx].Parent = newSlug
		}
	}
	for idx := range file.DirectoryItems {
		if file.DirectoryItems[idx].Space == oldSlug {
			file.DirectoryItems[idx].Space = newSlug
		}
	}
}

func clearParentReferences(file *provisioning.File, slug string) {
	for idx := range file.Spaces {
		if file.Spaces[idx].Parent == slug {
			file.Spaces[idx].Parent = ""
		}
	}
}

func removeDirectoryItemsForSpace(file *provisioning.File, slug string) {
	filtered := file.DirectoryItems[:0]
	for _, item := range file.DirectoryItems {
		if item.Space != slug {
			filtered = append(filtered, item)
		}
	}
	file.DirectoryItems = filtered
}
