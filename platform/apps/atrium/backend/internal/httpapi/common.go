package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

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
