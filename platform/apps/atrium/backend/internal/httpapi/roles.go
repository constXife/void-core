package httpapi

import (
	"encoding/json"
	"net/http"

	"atrium/internal/roles"
)

func handleRoles(w http.ResponseWriter, r *http.Request, deps Deps) {
	items, err := deps.ListRoles(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []roles.Role{}
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(items); err != nil {
		http.Error(w, "failed to encode roles", http.StatusInternalServerError)
	}
}
