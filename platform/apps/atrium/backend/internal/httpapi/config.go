package httpapi

import (
	"encoding/json"
	"net/http"

	"atrium/internal/foundation/webauth"
)

func handleConfigReload(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if deps.Auth != nil && !auth.IsAdmin(r.Context()) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if err := deps.ReloadConfig(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
