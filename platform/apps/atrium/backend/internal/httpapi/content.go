package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"atrium/internal/announcements"
	"atrium/internal/directory"
)

func handleAnnouncements(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		spaceID, err := parseSpaceIDQuery(r)
		if err != nil {
			http.Error(w, "space_id is required", http.StatusBadRequest)
			return
		}
		items, err := deps.ListAnnouncements(r.Context(), spaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if items == nil {
			items = []announcements.Announcement{}
		}
		writeJSON(w, items)
	case http.MethodPost:
		var input struct {
			SpaceID        int      `json:"space_id"`
			Priority       string   `json:"priority"`
			Title          string   `json:"title"`
			Body           string   `json:"body"`
			Pinned         bool     `json:"pinned"`
			ExpiresAt      *string  `json:"expires_at"`
			AudienceGroups []string `json:"audience_groups"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		payload := announcements.CreateInput{
			SpaceID:        input.SpaceID,
			Priority:       input.Priority,
			Title:          input.Title,
			Body:           input.Body,
			Pinned:         input.Pinned,
			AudienceGroups: input.AudienceGroups,
		}
		if input.ExpiresAt != nil && strings.TrimSpace(*input.ExpiresAt) != "" {
			if parsed, err := parseTime(*input.ExpiresAt); err == nil {
				payload.ExpiresAt = parsed
			}
		}
		created, err := deps.CreateAnnouncement(r.Context(), payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleAnnouncement(w http.ResponseWriter, r *http.Request, deps Deps) {
	id := strings.TrimPrefix(r.URL.Path, "/api/announcements/")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input struct {
			Title          string   `json:"title"`
			Body           string   `json:"body"`
			Priority       string   `json:"priority"`
			Pinned         bool     `json:"pinned"`
			ExpiresAt      *string  `json:"expires_at"`
			AudienceGroups []string `json:"audience_groups"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		payload := announcements.UpdateInput{
			Title:          input.Title,
			Body:           input.Body,
			Priority:       input.Priority,
			Pinned:         input.Pinned,
			AudienceGroups: input.AudienceGroups,
		}
		if input.ExpiresAt != nil && strings.TrimSpace(*input.ExpiresAt) != "" {
			if parsed, err := parseTime(*input.ExpiresAt); err == nil {
				payload.ExpiresAt = parsed
			}
		}
		updated, err := deps.UpdateAnnouncement(r.Context(), id, payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, updated)
	case http.MethodDelete:
		if err := deps.DeleteAnnouncement(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleDirectoryItems(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		spaceID, err := parseSpaceIDQuery(r)
		if err != nil {
			http.Error(w, "space_id is required", http.StatusBadRequest)
			return
		}
		items, err := deps.ListDirectory(r.Context(), spaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if items == nil {
			items = []directory.Item{}
		}
		writeJSON(w, items)
	case http.MethodPost:
		var input struct {
			SpaceID        int             `json:"space_id"`
			Type           string          `json:"type"`
			Key            string          `json:"key"`
			Title          string          `json:"title"`
			Description    string          `json:"description"`
			IconURL        string          `json:"icon_url"`
			URL            string          `json:"url"`
			Pinned         bool            `json:"pinned"`
			Tags           []string        `json:"tags"`
			ActionKeys     []string        `json:"action_keys"`
			AudienceGroups []string        `json:"audience_groups"`
			ServiceType    string          `json:"service_type"`
			Owners         json.RawMessage `json:"owners"`
			Links          json.RawMessage `json:"links"`
			Endpoints      json.RawMessage `json:"endpoints"`
			Tier           string          `json:"tier"`
			Lifecycle      string          `json:"lifecycle"`
			AccessPath     string          `json:"access_path"`
			RunbookURL     string          `json:"runbook_url"`
			Classification string          `json:"classification"`
			DependsOn      json.RawMessage `json:"depends_on"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		created, err := deps.CreateDirectory(r.Context(), directory.CreateInput{
			SpaceID:        input.SpaceID,
			Type:           input.Type,
			Key:            input.Key,
			Title:          input.Title,
			Description:    input.Description,
			IconURL:        input.IconURL,
			URL:            input.URL,
			Pinned:         input.Pinned,
			Tags:           input.Tags,
			ActionKeys:     input.ActionKeys,
			AudienceGroups: input.AudienceGroups,
			ServiceType:    input.ServiceType,
			Owners:         input.Owners,
			Links:          input.Links,
			Endpoints:      input.Endpoints,
			Tier:           input.Tier,
			Lifecycle:      input.Lifecycle,
			AccessPath:     input.AccessPath,
			RunbookURL:     input.RunbookURL,
			Classification: input.Classification,
			DependsOn:      input.DependsOn,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleDirectoryItem(w http.ResponseWriter, r *http.Request, deps Deps) {
	id := strings.TrimPrefix(r.URL.Path, "/api/directory_items/")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input struct {
			Type           string          `json:"type"`
			Key            string          `json:"key"`
			Title          string          `json:"title"`
			Description    string          `json:"description"`
			IconURL        string          `json:"icon_url"`
			URL            string          `json:"url"`
			Pinned         bool            `json:"pinned"`
			Tags           []string        `json:"tags"`
			ActionKeys     []string        `json:"action_keys"`
			AudienceGroups []string        `json:"audience_groups"`
			ServiceType    string          `json:"service_type"`
			Owners         json.RawMessage `json:"owners"`
			Links          json.RawMessage `json:"links"`
			Endpoints      json.RawMessage `json:"endpoints"`
			Tier           string          `json:"tier"`
			Lifecycle      string          `json:"lifecycle"`
			AccessPath     string          `json:"access_path"`
			RunbookURL     string          `json:"runbook_url"`
			Classification string          `json:"classification"`
			DependsOn      json.RawMessage `json:"depends_on"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		updated, err := deps.UpdateDirectory(r.Context(), id, directory.UpdateInput{
			Type:           input.Type,
			Key:            input.Key,
			Title:          input.Title,
			Description:    input.Description,
			IconURL:        input.IconURL,
			URL:            input.URL,
			Pinned:         input.Pinned,
			Tags:           input.Tags,
			ActionKeys:     input.ActionKeys,
			AudienceGroups: input.AudienceGroups,
			ServiceType:    input.ServiceType,
			Owners:         input.Owners,
			Links:          input.Links,
			Endpoints:      input.Endpoints,
			Tier:           input.Tier,
			Lifecycle:      input.Lifecycle,
			AccessPath:     input.AccessPath,
			RunbookURL:     input.RunbookURL,
			Classification: input.Classification,
			DependsOn:      input.DependsOn,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, updated)
	case http.MethodDelete:
		if err := deps.DeleteDirectory(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func parseSpaceIDQuery(r *http.Request) (int, error) {
	value := r.URL.Query().Get("space_id")
	if strings.TrimSpace(value) == "" {
		return 0, strconv.ErrSyntax
	}
	return strconv.Atoi(value)
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}

func parseTime(value string) (*time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return &parsed, nil
	}
	if parsed, err := time.Parse("2006-01-02T15:04", value); err == nil {
		return &parsed, nil
	}
	return nil, fmt.Errorf("invalid time format")
}
