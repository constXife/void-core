package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

func handleUserUpdate(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if deps.UpdateUserSegment == nil {
		http.Error(w, "users not configured", http.StatusInternalServerError)
		return
	}
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/users/")
	parts := strings.Split(strings.Trim(trimmed, "/"), "/")
	if len(parts) != 1 || parts[0] == "" {
		http.Error(w, "invalid user path", http.StatusBadRequest)
		return
	}
	userID := parts[0]

	var input struct {
		UserSegment *string `json:"user_segment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}
	if input.UserSegment == nil {
		http.Error(w, "user_segment is required", http.StatusBadRequest)
		return
	}
	if err := deps.UpdateUserSegment(r.Context(), userID, *input.UserSegment); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"user_segment": strings.TrimSpace(*input.UserSegment),
	})
}
