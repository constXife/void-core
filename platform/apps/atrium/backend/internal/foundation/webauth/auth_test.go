package auth

import "testing"

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
