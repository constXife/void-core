package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"atrium/internal/foundation/webauth"
	"atrium/internal/portal"
)

func handleSpaceDashboardRoutes(w http.ResponseWriter, r *http.Request, deps Deps) {
	if strings.HasSuffix(r.URL.Path, "/dashboard") {
		handleDashboard(w, r, deps)
		return
	}
	if strings.HasSuffix(r.URL.Path, "/blocks/data") {
		handleBlocksData(w, r, deps)
		return
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func handleDashboard(w http.ResponseWriter, r *http.Request, deps Deps) {
	if deps.LoadDashboard == nil {
		http.Error(w, "dashboard not configured", http.StatusInternalServerError)
		return
	}
	spaceID, err := parseSpaceID(r.URL.Path, "/dashboard")
	if err != nil {
		http.Error(w, "invalid space id", http.StatusBadRequest)
		return
	}

	session := sessionFromContext(r)
	ctx := withRoleOverride(r.Context(), r, session)
	switch r.Method {
	case http.MethodGet:
		payload, err := deps.LoadDashboard(ctx, spaceID, session)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			http.Error(w, "failed to encode dashboard", http.StatusInternalServerError)
		}
	case http.MethodPut:
		if deps.SaveDashboard == nil {
			http.Error(w, "dashboard save not configured", http.StatusInternalServerError)
			return
		}
		var input portal.DashboardSaveInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		payload, err := deps.SaveDashboard(ctx, spaceID, session, input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			http.Error(w, "failed to encode dashboard", http.StatusInternalServerError)
		}
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleBlocksData(w http.ResponseWriter, r *http.Request, deps Deps) {
	if deps.LoadBlocksData == nil {
		http.Error(w, "blocks not configured", http.StatusInternalServerError)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	spaceID, err := parseSpaceID(r.URL.Path, "/blocks/data")
	if err != nil {
		http.Error(w, "invalid space id", http.StatusBadRequest)
		return
	}

	ids := parseIDs(r.URL.Query().Get("ids"))
	types := parseIDs(r.URL.Query().Get("types"))
	blocks := make([]portal.BlockDescriptor, 0, len(ids))
	for idx, id := range ids {
		blockType := id
		if idx < len(types) && strings.TrimSpace(types[idx]) != "" {
			blockType = types[idx]
		}
		blocks = append(blocks, portal.BlockDescriptor{ID: id, Type: blockType})
	}
	session := sessionFromContext(r)
	ctx := withRoleOverride(r.Context(), r, session)
	payload, err := deps.LoadBlocksData(ctx, spaceID, session, blocks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode blocks data", http.StatusInternalServerError)
	}
}

func handleActionInvoke(w http.ResponseWriter, r *http.Request, deps Deps) {
	var input portal.ActionInvokeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}

	session := sessionFromContext(r)
	ctx := withRoleOverride(r.Context(), r, session)
	payload, err := deps.InvokeAction(ctx, input, session)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "failed to encode action result", http.StatusInternalServerError)
	}
}

func parseIDs(value string) []string {
	if strings.TrimSpace(value) == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, part)
	}
	return out
}

func parseSpaceID(path string, suffix string) (int, error) {
	trimmed := strings.TrimSuffix(path, suffix)
	trimmed = strings.TrimSuffix(trimmed, "/")
	trimmed = strings.TrimPrefix(trimmed, "/api/spaces/")
	return strconv.Atoi(trimmed)
}

func sessionFromContext(r *http.Request) auth.Session {
	session, ok := auth.UserFromContext(r.Context())
	if !ok {
		return auth.Session{}
	}
	return session
}
