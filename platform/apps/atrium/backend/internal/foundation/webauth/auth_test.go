package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/oauth2"
)

func TestSanitizeNext(t *testing.T) {
	t.Run("allows rooted relative path", func(t *testing.T) {
		if got := SanitizeNext("/dashboard?month=2026-04"); got != "/dashboard?month=2026-04" {
			t.Fatalf("expected rooted path to pass through, got %q", got)
		}
	})

	t.Run("rejects protocol relative target", func(t *testing.T) {
		if got := SanitizeNext("//evil.example"); got != "" {
			t.Fatalf("expected protocol-relative target to be rejected, got %q", got)
		}
	})

	t.Run("rejects absolute url", func(t *testing.T) {
		if got := SanitizeNext("https://evil.example"); got != "" {
			t.Fatalf("expected absolute URL to be rejected, got %q", got)
		}
	})

	t.Run("rejects backslashes", func(t *testing.T) {
		if got := SanitizeNext(`/\evil`); got != "" {
			t.Fatalf("expected backslash target to be rejected, got %q", got)
		}
	})
}

func TestOIDCStateCookieSameSiteFollowsSecureMode(t *testing.T) {
	if got := oidcStateCookieSameSite(true); got != http.SameSiteNoneMode {
		t.Fatalf("expected secure oidc state cookie to use SameSite=None, got %v", got)
	}
	if got := oidcStateCookieSameSite(false); got != http.SameSiteLaxMode {
		t.Fatalf("expected insecure oidc state cookie to use SameSite=Lax, got %v", got)
	}
}

func TestLoginHandlerUsesTemporaryRedirectAndSecureOIDCStateCookie(t *testing.T) {
	manager := &Manager{
		oidcEnabled:  true,
		cookieSecret: []byte("test-secret"),
		cookieSecure: true,
		oauth2Config: oauth2.Config{
			ClientID:    "atrium-bee",
			RedirectURL: "https://atrium.arkham.void/auth/callback",
			Endpoint: oauth2.Endpoint{
				AuthURL: "https://id.arkham.void/auth/v1/oidc/authorize",
			},
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/auth/login?next=%2F", nil)
	req.Header.Set("X-Forwarded-Host", "finance.arkham.void")
	req.Header.Set("X-Forwarded-Proto", "https")
	rec := httptest.NewRecorder()

	manager.LoginHandler(rec, req)

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("expected status 307, got %d", rec.Code)
	}

	cookies := rec.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("expected oidc state cookie to be set")
	}
	stateCookie := cookies[0]
	if stateCookie.Name != OIDCStateCookieName {
		t.Fatalf("expected oidc state cookie name %q, got %q", OIDCStateCookieName, stateCookie.Name)
	}
	if !stateCookie.Secure {
		t.Fatalf("expected oidc state cookie to be secure")
	}
	if stateCookie.SameSite != http.SameSiteNoneMode {
		t.Fatalf("expected oidc state cookie SameSite=None, got %v", stateCookie.SameSite)
	}
	if stateCookie.Domain != "" {
		t.Fatalf("expected oidc state cookie to stay host-only, got domain %q", stateCookie.Domain)
	}

	location := rec.Header().Get("Location")
	if !strings.HasPrefix(location, "https://id.arkham.void/auth/v1/oidc/authorize") {
		t.Fatalf("expected oidc authorization redirect, got %q", location)
	}
}
