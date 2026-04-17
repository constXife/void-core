package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"atrium/internal/foundation/webauth"
	"atrium/internal/portal"
	"atrium/internal/workspace"
)

func TestHealthOK(t *testing.T) {
	handler := Handler(Deps{})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestAuthModesWithoutAuth(t *testing.T) {
	handler := Handler(Deps{})

	req := httptest.NewRequest(http.MethodGet, "/api/auth/modes", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]bool
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode auth modes: %v", err)
	}

	if payload["oidc"] {
		t.Fatalf("expected oidc to be disabled")
	}
	if payload["local"] {
		t.Fatalf("expected local auth to be disabled")
	}
}

func TestAuthModesWithLocalAuth(t *testing.T) {
	manager, err := auth.NewManager(context.Background(), nil, auth.Config{
		LocalEnabled: true,
		CookieSecret: "test-secret",
	})
	if err != nil {
		t.Fatalf("create auth manager: %v", err)
	}

	handler := Handler(Deps{Auth: manager})
	req := httptest.NewRequest(http.MethodGet, "/api/auth/modes", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]bool
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode auth modes: %v", err)
	}

	if payload["oidc"] {
		t.Fatalf("expected oidc to be disabled")
	}
	if !payload["local"] {
		t.Fatalf("expected local auth to be enabled")
	}
}

func TestWorkspaceRouteReturnsPayload(t *testing.T) {
	called := false
	handler := Handler(Deps{
		LoadSpaces: func(ctx context.Context) (workspace.SpaceWorkspace, error) {
			called = true
			return workspace.SpaceWorkspace{
				Spaces: []workspace.Space{
					{
						ID:         "home",
						DatabaseID: 1,
						Title:      "Home",
						LayoutMode: "grid",
					},
				},
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/workspace", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if !called {
		t.Fatalf("expected LoadSpaces to be called")
	}

	var payload workspace.SpaceWorkspace
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode workspace payload: %v", err)
	}

	if len(payload.Spaces) != 1 {
		t.Fatalf("expected 1 space, got %d", len(payload.Spaces))
	}
	if payload.Spaces[0].ID != "home" {
		t.Fatalf("expected space id home, got %q", payload.Spaces[0].ID)
	}
}

func TestConfigReloadRoute(t *testing.T) {
	t.Run("rejects wrong method", func(t *testing.T) {
		handler := Handler(Deps{
			ReloadConfig: func(ctx context.Context) error {
				t.Fatalf("reload hook should not be called for GET")
				return nil
			},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/config/reload", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected status 405, got %d", rec.Code)
		}
	})

	t.Run("reloads config on post", func(t *testing.T) {
		called := false
		handler := Handler(Deps{
			ReloadConfig: func(ctx context.Context) error {
				called = true
				return nil
			},
		})

		req := httptest.NewRequest(http.MethodPost, "/api/config/reload", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if !called {
			t.Fatalf("expected ReloadConfig to be called")
		}

		var payload map[string]string
		if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
			t.Fatalf("decode reload response: %v", err)
		}
		if payload["status"] != "ok" {
			t.Fatalf("expected reload status ok, got %q", payload["status"])
		}
	})
}

func TestDashboardRouteLoadsSpaceDashboard(t *testing.T) {
	var loadedSpaceID int
	handler := Handler(Deps{
		LoadDashboard: func(ctx context.Context, spaceID int, session auth.Session) (portal.DashboardPayload, error) {
			loadedSpaceID = spaceID
			return portal.DashboardPayload{
				Space: portal.SpaceSummary{
					ID:    spaceID,
					Title: "Home",
					Slug:  "home",
				},
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/spaces/7/dashboard", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if loadedSpaceID != 7 {
		t.Fatalf("expected dashboard to load space 7, got %d", loadedSpaceID)
	}

	var payload portal.DashboardPayload
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode dashboard response: %v", err)
	}
	if payload.Space.Slug != "home" {
		t.Fatalf("expected dashboard slug home, got %q", payload.Space.Slug)
	}
}

func TestBlocksDataRouteParsesIDsAndTypes(t *testing.T) {
	handler := Handler(Deps{
		LoadBlocksData: func(ctx context.Context, spaceID int, session auth.Session, blocks []portal.BlockDescriptor) (map[string]any, error) {
			if spaceID != 5 {
				t.Fatalf("expected space id 5, got %d", spaceID)
			}
			if len(blocks) != 2 {
				t.Fatalf("expected 2 blocks, got %d", len(blocks))
			}
			if blocks[0].ID != "clock" || blocks[0].Type != "calendar" {
				t.Fatalf("unexpected first block: %+v", blocks[0])
			}
			if blocks[1].ID != "notes" || blocks[1].Type != "notes" {
				t.Fatalf("unexpected second block: %+v", blocks[1])
			}
			return map[string]any{
				"clock": map[string]string{"status": "ok"},
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/spaces/5/blocks/data?ids=clock,notes&types=calendar,", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode blocks response: %v", err)
	}
	if payload["clock"]["status"] != "ok" {
		t.Fatalf("expected block data to be returned")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestShoppingSummaryRouteReturnsServiceUnavailableWhenNotConfigured(t *testing.T) {
	handler := Handler(Deps{})

	req := httptest.NewRequest(http.MethodGet, "/api/shopping/summary", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rec.Code)
	}
}

func TestShoppingSummaryRouteProxiesConfiguredRequest(t *testing.T) {
	var gotAuth string
	var gotIntentLimit string

	handler := Handler(Deps{
		ShoppingAPIBaseURL: "https://api.example.test/knowledge/v1",
		ShoppingAPIToken:   "void_ak_test",
		ShoppingHTTPClient: &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.URL.Path != "/knowledge/v1/shopping/summary" {
					t.Fatalf("expected upstream path /knowledge/v1/shopping/summary, got %q", r.URL.Path)
				}
				gotAuth = r.Header.Get("Authorization")
				gotIntentLimit = r.URL.Query().Get("intent_limit")
				return &http.Response{
					StatusCode: http.StatusOK,
					Header: http.Header{
						"Content-Type": []string{"application/json"},
					},
					Body: io.NopCloser(strings.NewReader(`{"need_to_buy_count":2}`)),
				}, nil
			}),
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/shopping/summary?intent_limit=4", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if gotAuth != "Bearer void_ak_test" {
		t.Fatalf("expected bearer token to be forwarded, got %q", gotAuth)
	}
	if gotIntentLimit != "4" {
		t.Fatalf("expected intent_limit to be preserved, got %q", gotIntentLimit)
	}

	var payload map[string]int
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode shopping summary response: %v", err)
	}
	if payload["need_to_buy_count"] != 2 {
		t.Fatalf("expected need_to_buy_count 2, got %d", payload["need_to_buy_count"])
	}
}

func TestPublishedKnowledgeHostRouteRedirectsToLoginWhenSessionMissing(t *testing.T) {
	manager, err := auth.NewManager(context.Background(), nil, auth.Config{
		LocalEnabled: true,
		CookieSecret: "test-secret",
	})
	if err != nil {
		t.Fatalf("create auth manager: %v", err)
	}

	handler := Handler(Deps{
		Auth:                  manager,
		KnowledgeProxyBaseURL: "http://knowledge.internal:8787",
		KnowledgeProxyToken:   "bridge-token",
	})

	req := httptest.NewRequest(http.MethodGet, "/dashboard?month=2026-04", nil)
	req.Host = "finance.example.test"
	req.Header.Set("Accept", "text/html")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected status 302, got %d", rec.Code)
	}
	if got := rec.Header().Get("Location"); got != "/auth/login?next=%2Fdashboard%3Fmonth%3D2026-04" {
		t.Fatalf("expected login redirect, got %q", got)
	}
}

func TestInventoryPublishedDashboardRouteRedirectsToDefaultSlice(t *testing.T) {
	handler := Handler(Deps{
		KnowledgeProxyBaseURL: "http://knowledge.internal:8787",
		KnowledgeProxyToken:   "bridge-token",
		InventoryDefaultSlice: "pantry",
	})

	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	req.Host = "inventory.example.test"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected status 302, got %d", rec.Code)
	}
	if got := rec.Header().Get("Location"); got != "/dashboard?slice=pantry" {
		t.Fatalf("expected inventory default slice redirect, got %q", got)
	}
}

func TestPublishedKnowledgeHostRejectsLegacySurfacePath(t *testing.T) {
	handler := Handler(Deps{
		KnowledgeProxyBaseURL: "http://knowledge.internal:8787",
		KnowledgeProxyToken:   "bridge-token",
		InventoryDefaultSlice: "pantry",
	})

	req := httptest.NewRequest(http.MethodGet, "/inventory/dashboard/page?slice=pantry", nil)
	req.Host = "inventory.example.test"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rec.Code)
	}
}

func TestPublishedKnowledgeHostProxiesConfiguredRequest(t *testing.T) {
	manager, err := auth.NewManager(context.Background(), nil, auth.Config{
		LocalEnabled: true,
		CookieSecret: "test-secret",
	})
	if err != nil {
		t.Fatalf("create auth manager: %v", err)
	}

	encoded, err := manager.EncodeForTests(auth.Session{
		Email:       "admin@example.com",
		Role:        "admin",
			AuthSubject: "test-subject",
		ExpiresAt:   4102444800,
	})
	if err != nil {
		t.Fatalf("encode test session: %v", err)
	}

	var gotAuth string
	var gotSubject string
	var gotEmail string
	var gotRole string

	handler := Handler(Deps{
		Auth:                  manager,
		KnowledgeProxyBaseURL: "https://api.example.test",
		KnowledgeProxyToken:   "bridge-token",
		InventoryDefaultSlice: "pantry",
		KnowledgeProxyHTTPClient: &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.URL.Path != "/inventory/dashboard/page" {
					t.Fatalf("expected upstream path /inventory/dashboard/page, got %q", r.URL.Path)
				}
				gotAuth = r.Header.Get("Authorization")
				gotSubject = r.Header.Get(knowledgeAuthSubjectHeader)
				gotEmail = r.Header.Get(knowledgeUserEmailHeader)
				gotRole = r.Header.Get(knowledgeUserRoleHeader)
				return &http.Response{
					StatusCode: http.StatusOK,
					Header: http.Header{
						"Content-Type": []string{"text/html; charset=utf-8"},
					},
					Body: io.NopCloser(strings.NewReader("<html><a href=\"/inventory/items/eggs/page?include_archived=true\">item</a><form action=\"/inventory/forms/items\"></form></html>")),
				}, nil
			}),
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/dashboard?slice=pantry", nil)
	req.Host = "inventory.example.test"
	req.AddCookie(&http.Cookie{Name: "atrium_session", Value: encoded})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if gotAuth != "Bearer bridge-token" {
		t.Fatalf("expected bridge bearer token, got %q", gotAuth)
	}
	if gotSubject != "test-subject" {
		t.Fatalf("expected auth subject test-subject, got %q", gotSubject)
	}
	if gotEmail != "admin@example.com" {
		t.Fatalf("expected forwarded email, got %q", gotEmail)
	}
	if gotRole != "admin" {
		t.Fatalf("expected forwarded role, got %q", gotRole)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "/items/eggs?include_archived=true") {
		t.Fatalf("expected rewritten item inspect link, got %q", body)
	}
	if !strings.Contains(body, "/forms/items") {
		t.Fatalf("expected rewritten inventory form action, got %q", body)
	}
}
