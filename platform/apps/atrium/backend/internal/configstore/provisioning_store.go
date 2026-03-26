package configstore

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"

	"atrium/internal/provisioning"
)

type ProvisioningStore struct {
	Path string
	mu   sync.Mutex
}

func NewProvisioningStore(path string) *ProvisioningStore {
	return &ProvisioningStore{Path: path}
}

func (s *ProvisioningStore) Update(fn func(*provisioning.File) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	file, err := readProvisioningFile(s.Path)
	if err != nil {
		return err
	}
	if err := fn(&file); err != nil {
		return err
	}
	return writeProvisioningFile(s.Path, file)
}

func DecodeJSON(raw json.RawMessage, fallback any) any {
	if len(raw) == 0 {
		return fallback
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return fallback
	}
	return value
}

func readProvisioningFile(path string) (provisioning.File, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return provisioning.File{}, nil
		}
		return provisioning.File{}, fmt.Errorf("read provisioning file: %w", err)
	}
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" {
		return provisioning.File{}, nil
	}
	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".json" || strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var file provisioning.File
		if strings.HasPrefix(trimmed, "[") {
			return provisioning.File{}, fmt.Errorf("invalid provisioning format: expected object")
		}
		if err := json.Unmarshal([]byte(trimmed), &file); err != nil {
			return provisioning.File{}, fmt.Errorf("parse provisioning file: %w", err)
		}
		return file, nil
	}

	var file provisioning.File
	if err := yaml.Unmarshal([]byte(trimmed), &file); err != nil {
		return provisioning.File{}, fmt.Errorf("parse provisioning file: %w", err)
	}
	return file, nil
}

func writeProvisioningFile(path string, file provisioning.File) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("prepare config dir: %w", err)
	}
	ext := strings.ToLower(filepath.Ext(path))
	var payload []byte
	var err error
	if ext == ".json" {
		payload, err = json.MarshalIndent(file, "", "  ")
	} else {
		payload, err = yaml.Marshal(file)
	}
	if err != nil {
		return fmt.Errorf("encode provisioning file: %w", err)
	}
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		return fmt.Errorf("write provisioning file: %w", err)
	}
	return nil
}
