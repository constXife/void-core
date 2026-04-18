package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"atrium/internal/directory"
	"atrium/internal/foundation/webauth"
	"atrium/internal/foundation/webhttp"
	"atrium/internal/memberships"
	"atrium/internal/portal"
	"atrium/internal/roles"
	"atrium/internal/spaces"
	"atrium/internal/web"
	"atrium/internal/workspace"
)

type Deps struct {
	LoadSpaces               func(ctx context.Context) (workspace.SpaceWorkspace, error)
	ListCategories           func(ctx context.Context) ([]spaces.Space, error)
	ListCategoriesAll        func(ctx context.Context) ([]spaces.Space, error)
	CreateCategory           func(ctx context.Context, input spaces.Input) (spaces.Space, error)
	UpdateCategory           func(ctx context.Context, id int, input spaces.Input) (spaces.Space, error)
	ArchiveCategory          func(ctx context.Context, id int) error
	RestoreCategory          func(ctx context.Context, id int) error
	DeleteCategory           func(ctx context.Context, id int) error
	Auth                     *auth.Manager
	LoadDashboard            func(ctx context.Context, spaceID int, session auth.Session) (portal.DashboardPayload, error)
	LoadBlocksData           func(ctx context.Context, spaceID int, session auth.Session, blocks []portal.BlockDescriptor) (map[string]any, error)
	InvokeAction             func(ctx context.Context, input portal.ActionInvokeInput, session auth.Session) (portal.ActionInvokeResult, error)
	SaveDashboard            func(ctx context.Context, spaceID int, session auth.Session, input portal.DashboardSaveInput) (portal.DashboardPayload, error)
	ListTemplates            func(ctx context.Context) ([]portal.TemplateSummary, error)
	ListRoles                func(ctx context.Context) ([]roles.Role, error)
	RolePermissions          func(ctx context.Context, roleKey string) ([]string, error)
	UserSegmentByEmail       func(ctx context.Context, email string) (string, error)
	ListMemberships          func(ctx context.Context, spaceID *int) ([]memberships.Membership, error)
	UpsertMembership         func(ctx context.Context, input memberships.Input) (memberships.Membership, error)
	ImportMemberships        func(ctx context.Context, input memberships.ImportInput) (int, error)
	DeleteMembership         func(ctx context.Context, principalID string, spaceID int) error
	UpdateUserSegment        func(ctx context.Context, userID string, segment string) error
	ListDirectory            func(ctx context.Context, spaceID int) ([]directory.Item, error)
	CreateDirectory          func(ctx context.Context, input directory.CreateInput) (directory.Item, error)
	UpdateDirectory          func(ctx context.Context, id string, input directory.UpdateInput) (directory.Item, error)
	DeleteDirectory          func(ctx context.Context, id string) error
	ReloadConfig             func(ctx context.Context) error
	ShoppingAPIBaseURL       string
	ShoppingAPIToken         string
	ShoppingHTTPClient       *http.Client
}

func Handler(deps Deps) http.Handler {
	mux := http.NewServeMux()
	webhttp.InstallHealth(mux)
	if deps.Auth != nil {
		webhttp.InstallAuthRoutes(mux, webhttp.AuthRoutes{
			Login:    deps.Auth.LoginHandler,
			Callback: deps.Auth.CallbackHandler,
			Logout:   deps.Auth.LogoutHandler,
		})
	}
	webhttp.InstallAuthModes(mux, webhttp.AuthModes{
		OIDC:  deps.Auth != nil && deps.Auth.OIDCEnabled(),
		Local: deps.Auth != nil && deps.Auth.LocalEnabled(),
	})
	mux.HandleFunc("/api/v1/workspace", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth != nil {
			webhttp.WithOptionalAuth(deps.Auth, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handleSpacesWorkspace(w, r, deps)
			})).ServeHTTP(w, r)
			return
		}
		handleSpacesWorkspace(w, r, deps)
	})
	mux.HandleFunc("/api/config/reload", func(w http.ResponseWriter, r *http.Request) {
		if deps.ReloadConfig == nil {
			http.Error(w, "config reload not configured", http.StatusNotFound)
			return
		}
		if deps.Auth != nil {
			webhttp.WithRequiredAuth(deps.Auth, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handleConfigReload(w, r, deps)
			})).ServeHTTP(w, r)
			return
		}
		handleConfigReload(w, r, deps)
	})
	mux.HandleFunc("/api/widgets", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth != nil {
			webhttp.WithOptionalAuth(deps.Auth, http.HandlerFunc(handleWidgets)).ServeHTTP(w, r)
			return
		}
		handleWidgets(w, r)
	})
	mux.HandleFunc("/api/widgets/note", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth != nil {
			webhttp.WithOptionalAuth(deps.Auth, http.HandlerFunc(handleNote)).ServeHTTP(w, r)
			return
		}
		handleNote(w, r)
	})
	mux.HandleFunc("/api/me", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		webhttp.WithOptionalAuth(deps.Auth, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleMe(w, r, deps)
		})).ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/shopping/summary", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingSummary(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/provisioning/summary", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleProvisioningSummary(w, r, deps)
		}))).ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/provisioning/catalog", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleProvisioningCatalog(w, r, deps)
		}))).ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/shopping/runs", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingRuns(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/shopping/intents", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingIntents(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/shopping/intents/", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingIntent(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/shopping/runs/", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingRun(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/shopping/items", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingItems(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/shopping/items/", func(w http.ResponseWriter, r *http.Request) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleShoppingItem(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/categories", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handleCategories(w, r, deps)
			})).ServeHTTP(w, r)
			return
		}
		handleCategories(w, r, deps)
	})
	mux.HandleFunc("/api/categories/", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleCategory(w, r, deps)
		}))).ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/spaces", func(w http.ResponseWriter, r *http.Request) {
		if deps.Auth != nil {
			deps.Auth.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handleCategories(w, r, deps)
			})).ServeHTTP(w, r)
			return
		}
		handleCategories(w, r, deps)
	})
	mux.HandleFunc("/api/spaces/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/dashboard") || strings.HasSuffix(r.URL.Path, "/blocks/data") {
			handler := func(w http.ResponseWriter, r *http.Request) {
				handleSpaceDashboardRoutes(w, r, deps)
			}
			if deps.Auth != nil {
				deps.Auth.OptionalMiddleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
				return
			}
			handler(w, r)
			return
		}

		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleCategory(w, r, deps)
		}))).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/actions/invoke", func(w http.ResponseWriter, r *http.Request) {
		if deps.InvokeAction == nil {
			http.Error(w, "actions not configured", http.StatusInternalServerError)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleActionInvoke(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.OptionalMiddleware(http.HandlerFunc(handler)).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})

	mux.HandleFunc("/api/dashboard/templates", func(w http.ResponseWriter, r *http.Request) {
		if deps.ListTemplates == nil {
			http.Error(w, "templates not configured", http.StatusInternalServerError)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleDashboardTemplates(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})

	mux.HandleFunc("/api/roles", func(w http.ResponseWriter, r *http.Request) {
		if deps.ListRoles == nil {
			http.Error(w, "roles not configured", http.StatusInternalServerError)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleRoles(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})

	mux.HandleFunc("/api/memberships", func(w http.ResponseWriter, r *http.Request) {
		if deps.ListMemberships == nil || deps.UpsertMembership == nil {
			http.Error(w, "memberships not configured", http.StatusInternalServerError)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleMemberships(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})

	mux.HandleFunc("/api/memberships/", func(w http.ResponseWriter, r *http.Request) {
		if deps.DeleteMembership == nil {
			http.Error(w, "memberships not configured", http.StatusInternalServerError)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleMembership(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})

	mux.HandleFunc("/api/memberships/import", func(w http.ResponseWriter, r *http.Request) {
		if deps.ImportMemberships == nil {
			http.Error(w, "memberships not configured", http.StatusInternalServerError)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleMembershipImport(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/users/", func(w http.ResponseWriter, r *http.Request) {
		if deps.UpdateUserSegment == nil {
			http.Error(w, "users not configured", http.StatusInternalServerError)
			return
		}
		if deps.Auth == nil {
			http.Error(w, "auth not configured", http.StatusNotFound)
			return
		}
		deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleUserUpdate(w, r, deps)
		}))).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/directory_items", func(w http.ResponseWriter, r *http.Request) {
		if deps.ListDirectory == nil || deps.CreateDirectory == nil {
			http.Error(w, "directory not configured", http.StatusInternalServerError)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleDirectoryItems(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	mux.HandleFunc("/api/directory_items/", func(w http.ResponseWriter, r *http.Request) {
		if deps.UpdateDirectory == nil || deps.DeleteDirectory == nil {
			http.Error(w, "directory not configured", http.StatusInternalServerError)
			return
		}
		handler := func(w http.ResponseWriter, r *http.Request) {
			handleDirectoryItem(w, r, deps)
		}
		if deps.Auth != nil {
			deps.Auth.Middleware(auth.RequireRole("admin", http.HandlerFunc(handler))).ServeHTTP(w, r)
			return
		}
		handler(w, r)
	})
	webHandler := web.Handler()
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webHandler.ServeHTTP(w, r)
	}))

	return mux
}

func handleSpacesWorkspace(w http.ResponseWriter, r *http.Request, deps Deps) {
	if deps.LoadSpaces == nil {
		http.Error(w, "spaces workspace loader not configured", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	if session, ok := auth.UserFromContext(ctx); ok {
		ctx = withRoleOverride(ctx, r, session)
	}
	payload, err := deps.LoadSpaces(ctx)
	if err != nil {
		http.Error(w, "failed to load workspace", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode workspace", http.StatusInternalServerError)
	}
}

type notePayload struct {
	Content string `json:"content"`
}

func handleNote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimSpace(os.Getenv("FAMILY_NOTE_PATH"))
	if path == "" {
		path = "/etc/atrium/family_note.md"
	}
	data, err := readNoteFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(notePayload{Content: ""})
			return
		}
		http.Error(w, "failed to load note", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(notePayload{Content: string(data)}); err != nil {
		http.Error(w, "failed to encode note", http.StatusInternalServerError)
	}
}

func readNoteFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err == nil || filepath.IsAbs(path) || !os.IsNotExist(err) {
		return data, err
	}
	alt := filepath.Clean(filepath.Join("..", path))
	return os.ReadFile(alt)
}

func handleMe(w http.ResponseWriter, r *http.Request, deps Deps) {
	session, ok := auth.UserFromContext(r.Context())
	if !ok {
		webhttp.WriteJSON(w, nil)
		return
	}
	permissions := []string{"view"}
	if deps.RolePermissions != nil {
		if perms, err := deps.RolePermissions(r.Context(), session.Role); err == nil && len(perms) > 0 {
			permissions = perms
		}
	}
	segment := ""
	if deps.UserSegmentByEmail != nil {
		if value, err := deps.UserSegmentByEmail(r.Context(), session.Email); err == nil {
			segment = value
		}
	}
	payload := webhttp.NewSessionPayload(session)
	payload.Segment = segment
	payload.Permissions = permissions
	webhttp.WriteJSON(w, payload)
}

func handleCategories(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		includeArchived := r.URL.Query().Get("include_archived") == "1"
		listFn := deps.ListCategories
		if includeArchived {
			if deps.Auth != nil && !auth.IsAdmin(r.Context()) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			listFn = deps.ListCategoriesAll
		}
		if listFn == nil {
			http.Error(w, "categories list not configured", http.StatusInternalServerError)
			return
		}
		items, err := listFn(r.Context())
		if err != nil {
			http.Error(w, "failed to load categories", http.StatusInternalServerError)
			return
		}
		if items == nil {
			items = []spaces.Space{}
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(items); err != nil {
			http.Error(w, "failed to encode categories", http.StatusInternalServerError)
		}
	case http.MethodPost:
		if deps.CreateCategory == nil {
			http.Error(w, "category create not configured", http.StatusInternalServerError)
			return
		}
		if deps.Auth == nil || !auth.IsAdmin(r.Context()) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var input spaces.Input
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.CreateCategory(r.Context(), input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(item); err != nil {
			http.Error(w, "failed to encode category", http.StatusInternalServerError)
		}
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCategory(w http.ResponseWriter, r *http.Request, deps Deps) {
	prefix := "/api/categories/"
	if strings.HasPrefix(r.URL.Path, "/api/spaces/") {
		prefix = "/api/spaces/"
	}
	archiveAction := false
	restoreAction := false
	path := r.URL.Path
	if strings.HasSuffix(path, "/archive") {
		archiveAction = true
		path = strings.TrimSuffix(path, "/archive")
	} else if strings.HasSuffix(path, "/restore") {
		restoreAction = true
		path = strings.TrimSuffix(path, "/restore")
	}
	id, err := parseID(path, prefix)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPost:
		if !archiveAction && !restoreAction {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if archiveAction {
			if deps.ArchiveCategory == nil {
				http.Error(w, "category archive not configured", http.StatusInternalServerError)
				return
			}
			if err := deps.ArchiveCategory(r.Context(), id); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
		if restoreAction {
			if deps.RestoreCategory == nil {
				http.Error(w, "category restore not configured", http.StatusInternalServerError)
				return
			}
			if err := deps.RestoreCategory(r.Context(), id); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
		w.WriteHeader(http.StatusNoContent)
	case http.MethodPatch:
		if archiveAction || restoreAction {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if deps.UpdateCategory == nil {
			http.Error(w, "category update not configured", http.StatusInternalServerError)
			return
		}
		var input spaces.Input
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.UpdateCategory(r.Context(), id, input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(item); err != nil {
			http.Error(w, "failed to encode category", http.StatusInternalServerError)
		}
	case http.MethodDelete:
		if archiveAction || restoreAction {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if deps.DeleteCategory == nil {
			http.Error(w, "category delete not configured", http.StatusInternalServerError)
			return
		}
		if err := deps.DeleteCategory(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func parseID(path, prefix string) (int, error) {
	value := strings.TrimPrefix(path, prefix)
	if value == "" || strings.Contains(value, "/") {
		return 0, errors.New("invalid id")
	}
	return strconv.Atoi(value)
}
