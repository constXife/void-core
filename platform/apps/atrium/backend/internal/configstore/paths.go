package configstore

import (
	"os"
	"path/filepath"
	"strings"
)

type Paths struct {
	Provisioning string
	Widgets      string
}

type ReloadMode struct {
	Manual bool
	Watch  bool
}

func ResolvePaths() Paths {
	configDir := firstEnv("CONFIG_DIR", "ATRIUM_CONFIG_DIR")
	if configDir != "" {
		configDir = filepath.Clean(configDir)
		return Paths{
			Provisioning: filepath.Join(configDir, "provisioning.yaml"),
			Widgets:      filepath.Join(configDir, "widgets.yaml"),
		}
	}
	provisioningPath := strings.TrimSpace(os.Getenv("PROVISIONING_PATH"))
	if provisioningPath == "" {
		provisioningPath = "/etc/atrium/provisioning.yaml"
	}
	widgetsPath := strings.TrimSpace(os.Getenv("WIDGETS_CONFIG_PATH"))
	if widgetsPath == "" {
		widgetsPath = "/etc/atrium/widgets.yaml"
	}
	return Paths{
		Provisioning: provisioningPath,
		Widgets:      widgetsPath,
	}
}

func ReloadModeFromEnv() ReloadMode {
	value := strings.ToLower(strings.TrimSpace(firstEnv("CONFIG_RELOAD_MODE", "ATRIUM_CONFIG_RELOAD_MODE")))
	switch value {
	case "watch":
		return ReloadMode{Watch: true}
	case "both":
		return ReloadMode{Manual: true, Watch: true}
	default:
		return ReloadMode{Manual: true}
	}
}

func ConfigFirstEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(firstEnv("CONFIG_FIRST", "ATRIUM_CONFIG_FIRST")))
	return value == "1" || value == "true" || value == "yes"
}

func PreserveTemplateOnRename() bool {
	value := strings.ToLower(strings.TrimSpace(firstEnv("CONFIG_PRESERVE_TEMPLATE_ON_RENAME", "ATRIUM_CONFIG_PRESERVE_TEMPLATE_ON_RENAME")))
	if value == "" {
		return true
	}
	return value == "1" || value == "true" || value == "yes"
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}
