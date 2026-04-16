package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"atrium/internal/auth"
	"atrium/internal/configstore"
	"atrium/internal/directory"
	"atrium/internal/fixtures"
	"atrium/internal/httpapi"
	"atrium/internal/memberships"
	"atrium/internal/migrate"
	"atrium/internal/portal"
	"atrium/internal/provisioning"
	"atrium/internal/roles"
	"atrium/internal/spaces"
	"atrium/internal/users"
	"atrium/internal/workspace"

	"github.com/fsnotify/fsnotify"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	ctx := context.Background()

	dsn := os.Getenv("DATABASE_URL")
	noDBFixtureProfile := strings.TrimSpace(os.Getenv("ATRIUM_NO_DB_FIXTURE"))
	if dsn == "" && noDBFixtureProfile != "" {
		runNoDBFixtureServer(ctx, noDBFixtureProfile)
		return
	}
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "backend/migrations"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := migrate.Apply(ctx, db, migrationsDir); err != nil {
		log.Fatalf("apply migrations: %v", err)
	}

	configPaths := configstore.ResolvePaths()
	provisioningPath := configPaths.Provisioning
	configFirst := configstore.ConfigFirstEnabled()
	keepTemplateOnRename := configstore.PreserveTemplateOnRename()
	reloadMode := configstore.ReloadModeFromEnv()

	reloadOptions := provisioning.Options{
		ArchiveMissing: provisioning.ParseArchiveFlag(os.Getenv("PROVISIONING_ARCHIVE_MISSING")),
		PruneTemplates: configFirst,
		PruneDirectory: configFirst,
	}
	reloadProvisioning := func(ctx context.Context) error {
		return provisioning.Load(ctx, db, provisioningPath, reloadOptions)
	}

	if _, err := os.Stat(provisioningPath); err == nil {
		if err := reloadProvisioning(ctx); err != nil {
			log.Fatalf("load provisioning: %v", err)
		}
	}

	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "dev") {
		profile := os.Getenv("PROFILE")
		if profile == "" {
			profile = os.Getenv("ATRIUM_PROFILE")
		}
		if strings.TrimSpace(profile) != "" {
			if err := fixtures.Seed(ctx, db, profile); err != nil {
				log.Fatalf("seed fixtures: %v", err)
			}
		}
	}

	var authManager *auth.Manager
	if !isAuthDisabled() {
		roleMapExact, roleMapDomain := parseRoleMap(os.Getenv("AUTH_ROLE_MAP"))
		manager, err := auth.NewManager(ctx, db, auth.Config{
			Issuer:        os.Getenv("OIDC_ISSUER"),
			ClientID:      os.Getenv("OIDC_CLIENT_ID"),
			ClientSecret:  os.Getenv("OIDC_CLIENT_SECRET"),
			RedirectURL:   os.Getenv("OIDC_REDIRECT_URL"),
			LocalEnabled:  isLocalEnabled(),
			CookieSecret:  os.Getenv("AUTH_COOKIE_SECRET"),
			CookieName:    os.Getenv("AUTH_COOKIE_NAME"),
			AllowedEmails: splitCSV(os.Getenv("AUTH_ALLOWED_EMAILS")),
			AdminEmails:   splitCSV(os.Getenv("AUTH_ADMIN_EMAILS")),
			RoleMapExact:  roleMapExact,
			RoleMapDomain: roleMapDomain,
			SubjectMap:    parseExactMap(os.Getenv("AUTH_SUBJECT_MAP")),
			DefaultRole:   os.Getenv("AUTH_DEFAULT_ROLE"),
			GuestEnabled:  isGuestEnabled(),
			CookieSecure:  os.Getenv("AUTH_COOKIE_SECURE") == "1",
			CookieDomain:  os.Getenv("AUTH_COOKIE_DOMAIN"),
			RedirectHosts: splitCSV(os.Getenv("AUTH_REDIRECT_HOSTS")),
		})
		if err != nil {
			log.Fatalf("init auth: %v", err)
		}
		authManager = manager
		if authManager.LocalEnabled() {
			adminEmail := strings.TrimSpace(os.Getenv("AUTH_LOCAL_ADMIN_EMAIL"))
			adminPassword := os.Getenv("AUTH_LOCAL_ADMIN_PASSWORD")
			if adminEmail != "" && adminPassword != "" {
				if err := authManager.EnsureLocalAdmin(ctx, adminEmail, adminPassword); err != nil {
					log.Fatalf("init local admin: %v", err)
				}
			}
			devLocalEmails := append(
				splitCSV(os.Getenv("AUTH_ALLOWED_EMAILS")),
				splitCSV(os.Getenv("AUTH_ADMIN_EMAILS"))...,
			)
			if err := authManager.EnsureLocalUsers(ctx, devLocalEmails, adminPassword); err != nil {
				log.Fatalf("init local users: %v", err)
			}
		}
	}

	deps := httpapi.Deps{
		LoadSpaces: func(ctx context.Context) (workspace.SpaceWorkspace, error) {
			return workspace.LoadSpaces(ctx, db)
		},
		ListCategories: func(ctx context.Context) ([]spaces.Space, error) {
			return spaces.List(ctx, db)
		},
		ListCategoriesAll: func(ctx context.Context) ([]spaces.Space, error) {
			return spaces.ListAll(ctx, db)
		},
		CreateCategory: func(ctx context.Context, input spaces.Input) (spaces.Space, error) {
			return spaces.Create(ctx, db, input)
		},
		UpdateCategory: func(ctx context.Context, id int, input spaces.Input) (spaces.Space, error) {
			return spaces.Update(ctx, db, id, input)
		},
		DeleteCategory: func(ctx context.Context, id int) error {
			return spaces.Delete(ctx, db, id)
		},
		LoadDashboard: func(ctx context.Context, spaceID int, session auth.Session) (portal.DashboardPayload, error) {
			return portal.LoadDashboard(ctx, db, spaceID, session)
		},
		LoadBlocksData: func(ctx context.Context, spaceID int, session auth.Session, blocks []portal.BlockDescriptor) (map[string]any, error) {
			return portal.LoadBlocksData(ctx, db, spaceID, session, blocks)
		},
		InvokeAction: func(ctx context.Context, input portal.ActionInvokeInput, session auth.Session) (portal.ActionInvokeResult, error) {
			return portal.InvokeAction(ctx, db, input, session)
		},
		SaveDashboard: func(ctx context.Context, spaceID int, session auth.Session, input portal.DashboardSaveInput) (portal.DashboardPayload, error) {
			return portal.SaveDashboard(ctx, db, spaceID, session, input)
		},
		ListTemplates: func(ctx context.Context) ([]portal.TemplateSummary, error) {
			return portal.ListTemplates(ctx, db)
		},
		ListRoles: func(ctx context.Context) ([]roles.Role, error) {
			return roles.List(ctx, db)
		},
		RolePermissions: func(ctx context.Context, roleKey string) ([]string, error) {
			return roles.PermissionsForKey(ctx, db, roleKey)
		},
		UserSegmentByEmail: func(ctx context.Context, email string) (string, error) {
			return users.SegmentByEmail(ctx, db, email)
		},
		ListMemberships: func(ctx context.Context, spaceID *int) ([]memberships.Membership, error) {
			return memberships.List(ctx, db, spaceID)
		},
		UpsertMembership: func(ctx context.Context, input memberships.Input) (memberships.Membership, error) {
			return memberships.Upsert(ctx, db, input)
		},
		ImportMemberships: func(ctx context.Context, input memberships.ImportInput) (int, error) {
			return memberships.Import(ctx, db, input)
		},
		DeleteMembership: func(ctx context.Context, principalID string, spaceID int) error {
			return memberships.Delete(ctx, db, principalID, spaceID)
		},
		UpdateUserSegment: func(ctx context.Context, userID string, segment string) error {
			return users.UpdateSegment(ctx, db, userID, segment)
		},
		ListDirectory: func(ctx context.Context, spaceID int) ([]directory.Item, error) {
			return directory.List(ctx, db, spaceID)
		},
		CreateDirectory: func(ctx context.Context, input directory.CreateInput) (directory.Item, error) {
			return directory.Create(ctx, db, input)
		},
		UpdateDirectory: func(ctx context.Context, id string, input directory.UpdateInput) (directory.Item, error) {
			return directory.Update(ctx, db, id, input)
		},
		DeleteDirectory: func(ctx context.Context, id string) error {
			return directory.Delete(ctx, db, id)
		},
		Auth:                     authManager,
		ReloadConfig:             nil,
		ShoppingAPIBaseURL:       strings.TrimSpace(os.Getenv("KNOWLEDGE_API_BASE_URL")),
		ShoppingAPIToken:         strings.TrimSpace(os.Getenv("KNOWLEDGE_API_TOKEN")),
		ShoppingHTTPClient:       &http.Client{Timeout: 15 * time.Second},
		KnowledgeProxyBaseURL:    strings.TrimSpace(os.Getenv("KNOWLEDGE_PROXY_BASE_URL")),
		KnowledgeProxyToken:      strings.TrimSpace(os.Getenv("KNOWLEDGE_PROXY_TOKEN")),
		KnowledgeProxyHTTPClient: &http.Client{Timeout: 15 * time.Second},
		InventoryDefaultSlice:    defaultString(strings.TrimSpace(os.Getenv("INVENTORY_DEFAULT_SLICE")), "pantry"),
	}

	if configFirst {
		store := configstore.NewProvisioningStore(provisioningPath)
		configDeps := configFirstDeps{
			db:                   db,
			store:                store,
			reload:               reloadProvisioning,
			keepTemplateOnRename: keepTemplateOnRename,
		}
		deps.CreateCategory = configDeps.CreateCategory
		deps.UpdateCategory = configDeps.UpdateCategory
		deps.ArchiveCategory = configDeps.ArchiveCategory
		deps.RestoreCategory = configDeps.RestoreCategory
		deps.DeleteCategory = configDeps.DeleteCategory
		deps.SaveDashboard = configDeps.SaveDashboard
		deps.CreateDirectory = configDeps.CreateDirectory
		deps.UpdateDirectory = configDeps.UpdateDirectory
		deps.DeleteDirectory = configDeps.DeleteDirectory
	}

	if reloadMode.Manual {
		deps.ReloadConfig = func(ctx context.Context) error {
			return reloadProvisioning(ctx)
		}
	}

	if reloadMode.Watch {
		if err := watchProvisioning(ctx, provisioningPath, reloadProvisioning); err != nil {
			log.Printf("config watch disabled: %v", err)
		}
	}

	handler := httpapi.Handler(deps)

	addr := strings.TrimSpace(os.Getenv("LISTEN_ADDR"))
	if addr == "" {
		addr = strings.TrimSpace(os.Getenv("ATRIUM_LISTEN_ADDR"))
	}
	if addr == "" {
		addr = ":8080"
	}
	log.Printf("atrium server starting on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func runNoDBFixtureServer(_ context.Context, profile string) {
	runtimeState, err := fixtures.BuildRuntime(profile)
	if err != nil {
		log.Fatalf("build no-db fixtures: %v", err)
	}

	deps := httpapi.Deps{
		LoadSpaces:            runtimeState.LoadSpaces,
		ListCategories:        runtimeState.ListCategories,
		ListCategoriesAll:     runtimeState.ListCategoriesAll,
		LoadDashboard:         runtimeState.LoadDashboard,
		LoadBlocksData:        runtimeState.LoadBlocksData,
		ListDirectory:         runtimeState.ListDirectory,
		InventoryDefaultSlice: defaultString(strings.TrimSpace(os.Getenv("INVENTORY_DEFAULT_SLICE")), "pantry"),
	}

	handler := httpapi.Handler(deps)

	addr := strings.TrimSpace(os.Getenv("LISTEN_ADDR"))
	if addr == "" {
		addr = strings.TrimSpace(os.Getenv("ATRIUM_LISTEN_ADDR"))
	}
	if addr == "" {
		addr = ":8080"
	}
	log.Printf("atrium no-db fixture mode enabled with profile=%s", strings.TrimSpace(profile))
	log.Printf("atrium server starting on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func splitCSV(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, part)
	}
	return out
}

func parseExactMap(value string) map[string]string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	result := map[string]string{}
	for _, item := range strings.Split(value, ",") {
		parts := strings.SplitN(item, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		mapped := strings.TrimSpace(parts[1])
		if key == "" || mapped == "" {
			continue
		}
		result[key] = mapped
	}
	return result
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func parseRoleMap(value string) (map[string]string, map[string]string) {
	exact := map[string]string{}
	domain := map[string]string{}
	if value == "" {
		return exact, domain
	}
	entries := strings.Split(value, ",")
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		role := strings.ToLower(strings.TrimSpace(parts[1]))
		if key == "" || role == "" {
			continue
		}
		if strings.HasPrefix(key, "*@") {
			domain[strings.TrimPrefix(key, "*@")] = role
			continue
		}
		if strings.HasPrefix(key, "@") {
			domain[strings.TrimPrefix(key, "@")] = role
			continue
		}
		exact[key] = role
	}
	return exact, domain
}

func isGuestEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_GUEST_ENABLED")))
	return !(value == "0" || value == "false" || value == "no")
}

func isLocalEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_LOCAL_ENABLED")))
	return value == "1" || value == "true" || value == "yes"
}

func isAuthDisabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_DISABLED")))
	return value == "1" || value == "true" || value == "yes"
}

func watchProvisioning(ctx context.Context, path string, reload func(context.Context) error) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		_ = watcher.Close()
		return err
	}
	if err := watcher.Add(dir); err != nil {
		_ = watcher.Close()
		return err
	}
	go func() {
		defer watcher.Close()
		var timer *time.Timer
		trigger := func() {
			if timer != nil {
				timer.Stop()
			}
			timer = time.AfterFunc(200*time.Millisecond, func() {
				if err := reload(ctx); err != nil {
					log.Printf("reload provisioning: %v", err)
				}
			})
		}
		cleanPath := filepath.Clean(path)
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-watcher.Events:
				if filepath.Clean(event.Name) != cleanPath {
					continue
				}
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Rename) != 0 {
					trigger()
				}
			case err := <-watcher.Errors:
				if err != nil {
					log.Printf("watch provisioning: %v", err)
				}
			}
		}
	}()
	return nil
}
