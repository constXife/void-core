package fixtures

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"atrium/internal/foundation/webauth"
	"atrium/internal/directory"
	"atrium/internal/portal"
	"atrium/internal/spaces"
	"atrium/internal/workspace"
)

type RuntimeState struct {
	profile        string
	workspace      workspace.SpaceWorkspace
	categories     []spaces.Space
	directoryByID  map[int][]directory.Item
	dashboardsByID map[int]portal.DashboardPayload
}

func BuildRuntime(profile string) (RuntimeState, error) {
	profile = strings.ToLower(strings.TrimSpace(profile))
	if profile == "" {
		profile = "family"
	}

	var defs []runtimeSpace
	switch profile {
	case "family":
		defs = familyRuntimeSpaces()
	case "hotel":
		defs = hotelRuntimeSpaces()
	case "stress":
		defs = stressRuntimeSpaces()
	default:
		return RuntimeState{}, fmt.Errorf("unknown no-db fixture profile: %s", profile)
	}

	state := RuntimeState{
		profile:        profile,
		directoryByID:  make(map[int][]directory.Item, len(defs)),
		dashboardsByID: make(map[int]portal.DashboardPayload, len(defs)),
	}

	workspaceSpaces := make([]workspace.Space, 0, len(defs))
	categories := make([]spaces.Space, 0, len(defs))
	now := time.Now().UTC()

	for idx, def := range defs {
		id := idx + 1
		displayConfig := def.displayConfig()
		publicEntry := rawJSON(map[string]any{
			"title":       def.Title,
			"description": def.Description,
		})

		workspaceSpaces = append(workspaceSpaces, workspace.Space{
			ID:                   def.Slug,
			DatabaseID:           id,
			Title:                def.Title,
			AccessMode:           "public_readonly",
			IsDefaultPublicEntry: def.DefaultPublic,
			BackgroundURL:        def.BackgroundURL,
			LayoutMode:           def.LayoutMode,
			IsLockable:           def.IsLockable,
			Description:          def.Description,
			DisplayConfig:        displayConfig,
			PublicEntry:          publicEntry,
		})

		categories = append(categories, spaces.Space{
			ID:                   id,
			Title:                def.Title,
			Slug:                 def.Slug,
			Type:                 "audience",
			ProvisioningState:    "active",
			AccessMode:           "public_readonly",
			IsDefaultPublicEntry: def.DefaultPublic,
			LayoutMode:           def.LayoutMode,
			BackgroundURL:        def.BackgroundURL,
			IsLockable:           def.IsLockable,
			VisibilityGroups:     rawJSON([]string{}),
			DisplayConfig:        displayConfig,
			PersonalizationRules: rawJSON(map[string]any{}),
			PublicEntry:          publicEntry,
			IsProvisioned:        true,
		})

		items := make([]directory.Item, 0, len(def.Items))
		for itemIdx, item := range def.Items {
			items = append(items, directory.Item{
				ID:             fmt.Sprintf("%s-%02d", def.Slug, itemIdx+1),
				SpaceID:        id,
				Type:           defaultString(item.Type, "resource"),
				Key:            defaultString(item.Key, fmt.Sprintf("%s-%02d", def.Slug, itemIdx+1)),
				Title:          item.Title,
				Description:    item.Description,
				IconURL:        item.IconURL,
				URL:            item.URL,
				Pinned:         item.Pinned,
				Tags:           append([]string(nil), item.Tags...),
				ActionKeys:     append([]string(nil), item.ActionKeys...),
				AudienceGroups: append([]string(nil), item.AudienceGroups...),
				ServiceType:    item.ServiceType,
				Owners:         rawJSON(item.Owners),
				Links:          rawJSON(item.Links),
				Endpoints:      rawJSON(item.Endpoints),
				Tier:           item.Tier,
				Lifecycle:      item.Lifecycle,
				AccessPath:     item.AccessPath,
				RunbookURL:     item.RunbookURL,
				Classification: item.Classification,
				DependsOn:      rawJSON(item.DependsOn),
				CreatedAt:      now.Add(time.Duration(itemIdx) * time.Minute),
			})
		}
		state.directoryByID[id] = items
		state.dashboardsByID[id] = portal.DashboardPayload{
			Space: portal.SpaceSummary{
				ID:                   id,
				Title:                def.Title,
				Slug:                 def.Slug,
				Type:                 "audience",
				AccessMode:           "public_readonly",
				IsDefaultPublicEntry: def.DefaultPublic,
				LayoutMode:           def.LayoutMode,
				BackgroundURL:        def.BackgroundURL,
				IsLockable:           def.IsLockable,
				VisibilityGroups:     rawJSON([]string{}),
				DisplayConfig:        displayConfig,
				PersonalizationRules: rawJSON(map[string]any{}),
				PublicEntry:          publicEntry,
			},
			Template: portal.TemplatePayload{
				ID:      id,
				Key:     def.Slug,
				Version: 1,
				Blocks:  def.dashboardBlocks(),
			},
			Preferences: portal.PreferencesPayload{
				HiddenBlockIDs: rawJSON([]string{}),
				BlockOrder:     rawJSON([]string{}),
			},
			MobileOrder: rawJSON([]string{}),
		}
	}

	state.workspace = workspace.SpaceWorkspace{Spaces: workspaceSpaces}
	state.categories = categories
	return state, nil
}

func (s RuntimeState) LoadSpaces(context.Context) (workspace.SpaceWorkspace, error) {
	return s.workspace, nil
}

func (s RuntimeState) ListCategories(context.Context) ([]spaces.Space, error) {
	out := make([]spaces.Space, len(s.categories))
	copy(out, s.categories)
	return out, nil
}

func (s RuntimeState) ListCategoriesAll(context.Context) ([]spaces.Space, error) {
	return s.ListCategories(context.Background())
}

func (s RuntimeState) LoadDashboard(_ context.Context, spaceID int, _ auth.Session) (portal.DashboardPayload, error) {
	payload, ok := s.dashboardsByID[spaceID]
	if !ok {
		return portal.DashboardPayload{}, fmt.Errorf("space %d not found", spaceID)
	}
	return payload, nil
}

func (s RuntimeState) LoadBlocksData(_ context.Context, spaceID int, _ auth.Session, blocks []portal.BlockDescriptor) (map[string]any, error) {
	items, ok := s.directoryByID[spaceID]
	if !ok {
		return nil, fmt.Errorf("space %d not found", spaceID)
	}

	response := make(map[string]any, len(blocks))
	for _, block := range blocks {
		switch normalizeBlockType(block.Type) {
		case "resources_pinned":
			response[block.ID] = items
		case "text":
			response[block.ID] = map[string]any{}
		default:
			response[block.ID] = map[string]any{}
		}
	}
	return response, nil
}

func (s RuntimeState) ListDirectory(_ context.Context, spaceID int) ([]directory.Item, error) {
	items, ok := s.directoryByID[spaceID]
	if !ok {
		return []directory.Item{}, nil
	}
	out := make([]directory.Item, len(items))
	copy(out, items)
	return out, nil
}

type runtimeSpace struct {
	Slug          string
	Title         string
	Description   string
	LayoutMode    string
	BackgroundURL string
	IsLockable    bool
	DefaultPublic bool
	Items         []runtimeDirectoryItem
}

func (s runtimeSpace) displayConfig() json.RawMessage {
	return rawJSON(map[string]any{
		"description":            s.Description,
		"use_dashboard":          true,
		"dashboard_template_key": s.Slug,
		"default_lang":           "ru",
		"supported_langs":        []string{"ru", "en"},
	})
}

func (s runtimeSpace) dashboardBlocks() json.RawMessage {
	return rawJSON([]map[string]any{
		{
			"id":    fmt.Sprintf("%s-pinned", s.Slug),
			"type":  "core.resources_pinned",
			"title": "Pinned resources",
			"layout": map[string]any{
				"lg": map[string]any{
					"x": 1,
					"y": 1,
					"w": 6,
					"h": 2,
				},
				"xs": map[string]any{
					"order": 1,
				},
			},
			"config": map[string]any{
				"limit":  8,
				"scope":  "this",
				"filter": "pinned",
			},
		},
	})
}

type runtimeDirectoryItem struct {
	Type           string
	Key            string
	Title          string
	Description    string
	IconURL        string
	URL            string
	Pinned         bool
	Tags           []string
	ActionKeys     []string
	AudienceGroups []string
	ServiceType    string
	Owners         any
	Links          any
	Endpoints      any
	Tier           string
	Lifecycle      string
	AccessPath     string
	RunbookURL     string
	Classification string
	DependsOn      any
}

func familyRuntimeSpaces() []runtimeSpace {
	return []runtimeSpace{
		{
			Slug:          "home",
			Title:         "Home",
			Description:   "Семейное пространство",
			LayoutMode:    "grid",
			IsLockable:    true,
			DefaultPublic: true,
			Items: []runtimeDirectoryItem{
				{
					Key:            "wifi-password",
					Title:          "WiFi пароль",
					Description:    "Домашняя сеть и инструкции по подключению.",
					URL:            "#wifi",
					Pinned:         true,
					Tags:           []string{"network", "home"},
					AudienceGroups: []string{"guest"},
				},
				{
					Key:            "important-contacts",
					Title:          "Важные контакты",
					Description:    "Нужные номера и быстрые ссылки.",
					URL:            "#contacts",
					Pinned:         true,
					Tags:           []string{"contacts"},
					AudienceGroups: []string{"guest"},
				},
			},
		},
		{
			Slug:          "home-kids",
			Title:         "Kids",
			Description:   "Детский уголок",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/kids.svg",
			IsLockable:    true,
			Items: []runtimeDirectoryItem{
				{
					Key:            "youtube-kids",
					Title:          "YouTube Kids",
					Description:    "Безопасный видео-каталог для детей.",
					URL:            "https://www.youtubekids.com",
					Pinned:         true,
					Tags:           []string{"video", "kids"},
					AudienceGroups: []string{"guest"},
				},
				{
					Key:            "disney-plus",
					Title:          "Disney+",
					Description:    "Семейный каталог мультфильмов и фильмов.",
					URL:            "https://www.disneyplus.com",
					Pinned:         true,
					Tags:           []string{"video", "kids"},
					AudienceGroups: []string{"guest"},
				},
			},
		},
		{
			Slug:        "home-admin",
			Title:       "Admin",
			Description: "Инфраструктура и мониторинг",
			LayoutMode:  "grid",
			IsLockable:  true,
			Items: []runtimeDirectoryItem{
				{
					Type:           "service",
					Key:            "rauthy",
					Title:          "Rauthy",
					Description:    "OIDC identity provider",
					URL:            "https://id.example.local",
					Pinned:         true,
					Tags:           []string{"details", "auth"},
					ServiceType:    "identity",
					AudienceGroups: []string{"guest"},
					Links: map[string]any{
						"docs": "https://sebadob.github.io/rauthy/",
					},
				},
			},
		},
	}
}

func hotelRuntimeSpaces() []runtimeSpace {
	return []runtimeSpace{
		{
			Slug:          "lobby",
			Title:         "Welcome",
			Description:   "Все, что нужно гостю в первые минуты.",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/hotel.jpg",
			IsLockable:    true,
			DefaultPublic: true,
			Items: []runtimeDirectoryItem{
				{
					Key:            "wifi",
					Title:          "Guest WiFi",
					Description:    "Сеть и пароль для гостей.",
					URL:            "#wifi",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
				{
					Key:            "concierge",
					Title:          "Concierge",
					Description:    "Связаться с ресепшен и сервисом.",
					URL:            "#concierge",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
			},
		},
		{
			Slug:          "room",
			Title:         "Room Control",
			Description:   "Управление светом, климатом и сервисами номера.",
			LayoutMode:    "grid",
			BackgroundURL: "/wallpapers/room.jpg",
			IsLockable:    true,
			Items: []runtimeDirectoryItem{
				{
					Key:            "lights",
					Title:          "Lights",
					Description:    "Сценарии освещения и режимы комнаты.",
					URL:            "#lights",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
				{
					Key:            "climate",
					Title:          "Climate",
					Description:    "Температура и климат-контроль.",
					URL:            "#climate",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
			},
		},
	}
}

func stressRuntimeSpaces() []runtimeSpace {
	return []runtimeSpace{
		{
			Slug:          "ops",
			Title:         "Operations",
			Description:   "Техничка: метрики, статус, алерты.",
			LayoutMode:    "list",
			BackgroundURL: "/wallpapers/matrix.jpg",
			IsLockable:    false,
			DefaultPublic: true,
			Items: []runtimeDirectoryItem{
				{
					Type:           "service",
					Key:            "grafana",
					Title:          "Grafana",
					Description:    "Метрики и дашборды.",
					URL:            "https://grafana.example.local",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
					Links: map[string]any{
						"dashboards": "https://grafana.example.local/dashboards",
					},
				},
				{
					Type:           "service",
					Key:            "alertmanager",
					Title:          "Alertmanager",
					Description:    "Маршрутизация алертов.",
					URL:            "https://alerts.example.local",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
			},
		},
		{
			Slug:          "apps",
			Title:         "Apps",
			Description:   "Быстрый доступ к ключевым сервисам.",
			LayoutMode:    "grid",
			BackgroundURL: "/wallpapers/apps.jpg",
			IsLockable:    false,
			Items: []runtimeDirectoryItem{
				{
					Key:            "docs",
					Title:          "Docs",
					Description:    "Внутренняя документация.",
					URL:            "https://docs.example.local",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
				{
					Key:            "status",
					Title:          "Status",
					Description:    "Сервисный статус и окна обслуживания.",
					URL:            "https://status.example.local",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
			},
		},
		{
			Slug:          "media",
			Title:         "Media",
			Description:   "Контент для просмотра и отдыха.",
			LayoutMode:    "hero",
			BackgroundURL: "/wallpapers/cinema.jpg",
			IsLockable:    false,
			Items: []runtimeDirectoryItem{
				{
					Key:            "cinema",
					Title:          "Cinema",
					Description:    "Каталог фильмов и сериалов.",
					URL:            "https://cinema.example.local",
					Pinned:         true,
					AudienceGroups: []string{"guest"},
				},
			},
		},
	}
}

func rawJSON(value any) json.RawMessage {
	if value == nil {
		return json.RawMessage("null")
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage("null")
	}
	return raw
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

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
