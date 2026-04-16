package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"atrium/internal/memberships"
)

func handleMemberships(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		var spaceID *int
		if value := r.URL.Query().Get("space_id"); value != "" {
			if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
				spaceID = &parsed
			}
		}
		items, err := deps.ListMemberships(r.Context(), spaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(items); err != nil {
			http.Error(w, "failed to encode memberships", http.StatusInternalServerError)
		}
	case http.MethodPost:
		var input struct {
			Email       string  `json:"email"`
			SpaceID     int     `json:"space_id"`
			RoleID      int     `json:"role_id"`
			RoleKey     string  `json:"role_key"`
			UserSegment *string `json:"user_segment"`
			ValidFrom   *string `json:"valid_from"`
			ValidTo     *string `json:"valid_to"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		payload := memberships.Input{
			Email:       input.Email,
			SpaceID:     input.SpaceID,
			RoleID:      input.RoleID,
			RoleKey:     input.RoleKey,
			UserSegment: input.UserSegment,
		}
		if input.ValidFrom != nil && strings.TrimSpace(*input.ValidFrom) != "" {
			if parsed, err := parseTime(*input.ValidFrom); err == nil {
				payload.ValidFrom = parsed
			}
		}
		if input.ValidTo != nil && strings.TrimSpace(*input.ValidTo) != "" {
			if parsed, err := parseTime(*input.ValidTo); err == nil {
				payload.ValidTo = parsed
			}
		}
		created, err := deps.UpsertMembership(r.Context(), payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(created); err != nil {
			http.Error(w, "failed to encode membership", http.StatusInternalServerError)
		}
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleMembership(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	principalID, spaceID, err := parseMembershipPath(r.URL.Path)
	if err != nil {
		http.Error(w, "invalid membership path", http.StatusBadRequest)
		return
	}
	if err := deps.DeleteMembership(r.Context(), principalID, spaceID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func handleMembershipImport(w http.ResponseWriter, r *http.Request, deps Deps) {
	var input struct {
		SpaceID   int      `json:"space_id"`
		RoleID    int      `json:"role_id"`
		RoleKey   string   `json:"role_key"`
		Emails    []string `json:"emails"`
		ValidFrom *string  `json:"valid_from"`
		ValidTo   *string  `json:"valid_to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}
	payload := memberships.ImportInput{
		SpaceID: input.SpaceID,
		RoleID:  input.RoleID,
		RoleKey: input.RoleKey,
		Emails:  input.Emails,
	}
	if input.ValidFrom != nil && strings.TrimSpace(*input.ValidFrom) != "" {
		if parsed, err := parseTime(*input.ValidFrom); err == nil {
			payload.ValidFrom = parsed
		}
	}
	if input.ValidTo != nil && strings.TrimSpace(*input.ValidTo) != "" {
		if parsed, err := parseTime(*input.ValidTo); err == nil {
			payload.ValidTo = parsed
		}
	}
	count, err := deps.ImportMemberships(r.Context(), payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"imported": count}); err != nil {
		http.Error(w, "failed to encode import result", http.StatusInternalServerError)
	}
}

func parseMembershipPath(path string) (string, int, error) {
	trimmed := strings.TrimPrefix(path, "/api/memberships/")
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 {
		return "", 0, strconv.ErrSyntax
	}
	spaceID, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", 0, err
	}
	return parts[0], spaceID, nil
}

// parseTime moved to content.go
