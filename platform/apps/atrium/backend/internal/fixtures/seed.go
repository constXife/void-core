package fixtures

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

type DirectoryInput struct {
	SpaceSlug      string
	Title          string
	URL            string
	ItemType       string
	Pinned         bool
	Tags           []string
	ActionKeys     []string
	AudienceGroups []string
}

func Seed(ctx context.Context, db *sql.DB, profile string) error {
	profile = strings.ToLower(strings.TrimSpace(profile))
	switch profile {
	case "family":
		return seedFamily(ctx, db)
	case "hotel":
		return seedHotel(ctx, db)
	case "stress":
		return seedStress(ctx, db)
	default:
		return fmt.Errorf("unknown profile: %s", profile)
	}
}

func seedFamily(ctx context.Context, db *sql.DB) error {
	spaces := []spaceInput{
		{
			Slug:          "home",
			Title:         "Home",
			LayoutMode:    "grid",
			BackgroundURL: "",
			IsLockable:    true,
			Description:   "Семейное пространство",
		},
		{
			Slug:          "home-kids",
			Title:         "Kids",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/kids.svg",
			IsLockable:    true,
			Description:   "Детский уголок",
		},
		{
			Slug:          "home-admin",
			Title:         "Admin",
			LayoutMode:    "grid",
			BackgroundURL: "",
			IsLockable:    true,
			Description:   "Инфраструктура и мониторинг",
		},
	}

	// Sample directory items
	directory := []DirectoryInput{
		// Home resources
		{
			SpaceSlug:      "home",
			Title:          "WiFi пароль",
			URL:            "#wifi",
			ItemType:       "resource",
			Pinned:         true,
			Tags:           []string{"network", "home"},
			AudienceGroups: []string{"user", "admin"},
		},
		{
			SpaceSlug:      "home",
			Title:          "Важные контакты",
			URL:            "#contacts",
			ItemType:       "resource",
			Pinned:         true,
			Tags:           []string{"contacts"},
			AudienceGroups: []string{"user", "admin"},
		},
		// Kids safe links
		{
			SpaceSlug:      "home-kids",
			Title:          "YouTube Kids",
			URL:            "https://www.youtubekids.com",
			ItemType:       "resource",
			Pinned:         true,
			Tags:           []string{"video", "kids"},
			AudienceGroups: []string{"user"},
		},
		{
			SpaceSlug:      "home-kids",
			Title:          "Disney+",
			URL:            "https://www.disneyplus.com",
			ItemType:       "resource",
			Pinned:         true,
			Tags:           []string{"video", "kids"},
			AudienceGroups: []string{"user"},
		},
	}

	return seedData(ctx, db, spaces, directory)
}

func seedHotel(ctx context.Context, db *sql.DB) error {
	spaces := []spaceInput{
		{
			Slug:          "lobby",
			Title:         "Welcome",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/hotel.jpg",
			IsLockable:    true,
			Description:   "Все, что нужно гостю в первые минуты.",
		},
		{
			Slug:          "room",
			Title:         "Room Control",
			LayoutMode:    "grid",
			BackgroundURL: "/wallpapers/room.jpg",
			IsLockable:    true,
			Description:   "Управление светом, климатом и сервисами номера.",
		},
	}
	directory := []DirectoryInput{}
	return seedData(ctx, db, spaces, directory)
}

func seedStress(ctx context.Context, db *sql.DB) error {
	spaces := []spaceInput{
		{
			Slug:          "ops",
			Title:         "Operations",
			LayoutMode:    "list",
			BackgroundURL: "/wallpapers/matrix.jpg",
			IsLockable:    false,
			Description:   "Техничка: метрики, статус, алерты.",
		},
		{
			Slug:          "apps",
			Title:         "Apps",
			LayoutMode:    "grid",
			BackgroundURL: "/wallpapers/apps.jpg",
			IsLockable:    false,
			Description:   "Быстрый доступ к ключевым сервисам.",
		},
		{
			Slug:          "media",
			Title:         "Media",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/cinema.jpg",
			IsLockable:    false,
			Description:   "Контент для просмотра и отдыха.",
		},
	}

	return seedData(ctx, db, spaces, nil)
}

type spaceInput struct {
	Slug                 string
	Title                string
	AccessMode           string
	IsDefaultPublicEntry bool
	LayoutMode           string
	BackgroundURL        string
	IsLockable           bool
	Description          string
	PublicEntry          any
}

func seedData(ctx context.Context, db *sql.DB, spaces []spaceInput, directory []DirectoryInput) error {
	spaceIDs := make(map[string]int, len(spaces))
	for _, space := range spaces {
		id, err := upsertSpace(ctx, db, space)
		if err != nil {
			return err
		}
		spaceIDs[space.Slug] = id
	}
	if err := seedDirectory(ctx, db, spaceIDs, directory); err != nil {
		return err
	}
	return nil
}

func upsertSpace(ctx context.Context, db *sql.DB, space spaceInput) (int, error) {
	layout := space.LayoutMode
	if layout == "" {
		layout = "grid"
	}
	accessMode := strings.TrimSpace(space.AccessMode)
	if accessMode != "public_readonly" {
		accessMode = "private"
	}
	displayConfig, err := json.Marshal(map[string]any{
		"description": space.Description,
	})
	if err != nil {
		return 0, fmt.Errorf("encode display_config for %s: %w", space.Slug, err)
	}
	publicEntry := space.PublicEntry
	if publicEntry == nil {
		publicEntry = map[string]any{}
	}
	publicEntryJSON, err := json.Marshal(publicEntry)
	if err != nil {
		return 0, fmt.Errorf("encode public_entry for %s: %w", space.Slug, err)
	}
	var id int
	err = db.QueryRowContext(ctx, `
		INSERT INTO spaces (slug, title, access_mode, is_default_public_entry, layout_mode, background_url, is_lockable, display_config, public_entry, is_provisioned)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			access_mode = EXCLUDED.access_mode,
			is_default_public_entry = EXCLUDED.is_default_public_entry,
			layout_mode = EXCLUDED.layout_mode,
			background_url = EXCLUDED.background_url,
			is_lockable = EXCLUDED.is_lockable,
			display_config = EXCLUDED.display_config,
			public_entry = EXCLUDED.public_entry
		RETURNING id
	`, space.Slug, space.Title, accessMode, space.IsDefaultPublicEntry, layout, space.BackgroundURL, space.IsLockable, displayConfig, publicEntryJSON).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("upsert space %s: %w", space.Slug, err)
	}
	return id, nil
}

func seedDirectory(ctx context.Context, db *sql.DB, spaceIDs map[string]int, items []DirectoryInput) error {
	for _, item := range items {
		spaceID, ok := spaceIDs[item.SpaceSlug]
		if !ok {
			return fmt.Errorf("unknown space %s for directory", item.SpaceSlug)
		}
		if item.ItemType == "" {
			item.ItemType = "resource"
		}
		tagsJSON, err := json.Marshal(item.Tags)
		if err != nil {
			return fmt.Errorf("encode tags: %w", err)
		}
		actionsJSON, err := json.Marshal(item.ActionKeys)
		if err != nil {
			return fmt.Errorf("encode action keys: %w", err)
		}
		audienceJSON, err := json.Marshal(item.AudienceGroups)
		if err != nil {
			return fmt.Errorf("encode audience groups: %w", err)
		}
		_, err = db.ExecContext(ctx, `
			INSERT INTO directory_items (space_id, type, key, title, url, pinned, tags, action_keys, audience_groups)
			VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
		`, spaceID, item.ItemType, item.Title, item.URL, item.Pinned, tagsJSON, actionsJSON, audienceJSON)
		if err != nil {
			return fmt.Errorf("insert directory item: %w", err)
		}
	}
	return nil
}
