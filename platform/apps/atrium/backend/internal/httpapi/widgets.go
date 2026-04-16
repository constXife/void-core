package httpapi

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"

	"atrium/internal/configstore"
)

type Widget struct {
	ID          string   `json:"id" yaml:"id"`
	Type        string   `json:"type" yaml:"type"`
	Title       string   `json:"title,omitempty" yaml:"title,omitempty"`
	Content     string   `json:"content,omitempty" yaml:"content,omitempty"`
	ContentFile string   `json:"content_file,omitempty" yaml:"content_file,omitempty"`
	Spaces      []string `json:"spaces,omitempty" yaml:"spaces,omitempty"`
	TimeFormat  string   `json:"time_format,omitempty" yaml:"time_format,omitempty"`
	Style       string   `json:"style,omitempty" yaml:"style,omitempty"`
	DateLabel   string   `json:"date_label,omitempty" yaml:"date_label,omitempty"`
	Events      []Event  `json:"events,omitempty" yaml:"events,omitempty"`
	Todos       []Todo   `json:"todos,omitempty" yaml:"todos,omitempty"`
	Booking     *Booking `json:"booking,omitempty" yaml:"booking,omitempty"`
	// Timeline widget fields
	Limit      int      `json:"limit,omitempty" yaml:"limit,omitempty"`           // Max notifications to show
	Categories []string `json:"categories,omitempty" yaml:"categories,omitempty"` // Filter by category
}

type Event struct {
	Time   string `json:"time" yaml:"time"`
	Title  string `json:"title" yaml:"title"`
	Status string `json:"status,omitempty" yaml:"status,omitempty"`
}

type Todo struct {
	Text string `json:"text" yaml:"text"`
	Done bool   `json:"done" yaml:"done"`
}

type Booking struct {
	Resource    string `json:"resource" yaml:"resource"`
	Status      string `json:"status" yaml:"status"`
	Cta         string `json:"cta,omitempty" yaml:"cta,omitempty"`
	BusyPercent int    `json:"busy_percent,omitempty" yaml:"busy_percent,omitempty"`
}

type widgetConfig struct {
	Widgets []Widget `json:"widgets" yaml:"widgets"`
}

func handleWidgets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := configstore.ResolvePaths().Widgets

	widgets, err := loadWidgets(path)
	if err != nil {
		http.Error(w, "failed to load widgets", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(widgets); err != nil {
		http.Error(w, "failed to encode widgets", http.StatusInternalServerError)
	}
}

func loadWidgets(path string) ([]Widget, error) {
	raw, err := readNoteFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []Widget{}, nil
		}
		return nil, err
	}

	var cfg widgetConfig
	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".yaml" || ext == ".yml" {
		if err := yaml.Unmarshal(raw, &cfg); err != nil {
			return nil, err
		}
	} else {
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, err
		}
	}

	baseDir := filepath.Dir(path)
	for i := range cfg.Widgets {
		widget := &cfg.Widgets[i]
		if widget.Content == "" && widget.ContentFile != "" {
			contentPath := widget.ContentFile
			if !filepath.IsAbs(contentPath) {
				contentPath = filepath.Join(baseDir, contentPath)
			}
			data, err := readNoteFile(contentPath)
			if err == nil {
				widget.Content = string(data)
			}
		}
		if len(widget.Spaces) == 0 {
			widget.Spaces = []string{"*"}
		}
		if widget.Type == "" {
			widget.Type = "markdown"
		}
	}

	return cfg.Widgets, nil
}
