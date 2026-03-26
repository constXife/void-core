package httpapi

import (
	"encoding/json"
	"net/http"

	"atrium/internal/portal"
)

func handleDashboardTemplates(w http.ResponseWriter, r *http.Request, deps Deps) {
	items, err := deps.ListTemplates(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []portal.TemplateSummary{}
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(items); err != nil {
		http.Error(w, "failed to encode templates", http.StatusInternalServerError)
	}
}
