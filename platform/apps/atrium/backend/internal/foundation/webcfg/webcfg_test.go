package webcfg

import "testing"

func TestSplitCSV(t *testing.T) {
	got := SplitCSV(" admin@example.com, user@example.com ,, ")
	if len(got) != 2 || got[0] != "admin@example.com" || got[1] != "user@example.com" {
		t.Fatalf("unexpected csv parse result: %#v", got)
	}
}

func TestParseExactMap(t *testing.T) {
	got := ParseExactMap("Admin@example.com=admin, broken, user@example.com = user-1")
	if len(got) != 2 {
		t.Fatalf("unexpected exact map size: %#v", got)
	}
	if got["admin@example.com"] != "admin" {
		t.Fatalf("expected normalized admin mapping, got %#v", got)
	}
	if got["user@example.com"] != "user-1" {
		t.Fatalf("expected user mapping, got %#v", got)
	}
}

func TestParseRoleMap(t *testing.T) {
	exact, domain := ParseRoleMap("Admin@example.com=admin,*@example.com=user,@test.local=operator")
	if exact["admin@example.com"] != "admin" {
		t.Fatalf("expected exact role map, got %#v", exact)
	}
	if domain["example.com"] != "user" || domain["test.local"] != "operator" {
		t.Fatalf("expected domain role map, got %#v", domain)
	}
}

func TestResolveListenAddrFromExplicitHostPort(t *testing.T) {
	t.Setenv("WEB_ADDR", "127.0.0.1")
	t.Setenv("WEB_PORT", "8080")
	got := ResolveListenAddr("WEB_ADDR", "WEB_PORT", nil, "0.0.0.0", "9999")
	if got != "127.0.0.1:8080" {
		t.Fatalf("unexpected explicit listen addr: %q", got)
	}
}

func TestResolveListenAddrFallsBackToAddrEnv(t *testing.T) {
	t.Setenv("LISTEN_ADDR", ":18180")
	got := ResolveListenAddr("WEB_ADDR", "WEB_PORT", []string{"LISTEN_ADDR"}, "127.0.0.1", "8080")
	if got != ":18180" {
		t.Fatalf("unexpected fallback listen addr: %q", got)
	}
}

func TestResolveListenAddrUsesDefaults(t *testing.T) {
	got := ResolveListenAddr("", "", []string{"LISTEN_ADDR"}, "", "8080")
	if got != ":8080" {
		t.Fatalf("unexpected default listen addr: %q", got)
	}
}

func TestEnvBoolSemantics(t *testing.T) {
	t.Setenv("FLAG_TRUE", "yes")
	t.Setenv("FLAG_FALSE", "no")
	if !IsTruthyEnv("FLAG_TRUE") {
		t.Fatal("expected truthy env to be enabled")
	}
	if IsTruthyEnv("FLAG_FALSE") {
		t.Fatal("expected false env to be disabled")
	}
	if IsEnabledUnlessFalseEnv("FLAG_FALSE") {
		t.Fatal("expected disabled-unless-false env to be false")
	}
	if !IsEnabledUnlessFalseEnv("MISSING_FLAG") {
		t.Fatal("expected missing enabled-unless-false env to default to true")
	}
}
