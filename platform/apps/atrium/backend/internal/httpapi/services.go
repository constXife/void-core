package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"atrium/internal/services"
)

func handleServices(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		items, err := deps.ListServices(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if items == nil {
			items = []services.Service{}
		}
		writeJSON(w, items)
	case http.MethodPost:
		var input services.ServiceInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.CreateService(r.Context(), input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, item)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleService(w http.ResponseWriter, r *http.Request, deps Deps) {
	id, err := parseID(r.URL.Path, "/api/services/")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input services.ServiceInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.UpdateService(r.Context(), id, input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, item)
	case http.MethodDelete:
		if err := deps.DeleteService(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handlePlacements(w http.ResponseWriter, r *http.Request, deps Deps) {
	switch r.Method {
	case http.MethodGet:
		var spaceID *int
		var serviceKey *string
		if value := strings.TrimSpace(r.URL.Query().Get("space_id")); value != "" {
			if parsed, err := strconv.Atoi(value); err == nil {
				spaceID = &parsed
			}
		}
		if value := strings.TrimSpace(r.URL.Query().Get("service_key")); value != "" {
			serviceKey = &value
		}
		items, err := deps.ListPlacements(r.Context(), spaceID, serviceKey)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if items == nil {
			items = []services.Placement{}
		}
		writeJSON(w, items)
	case http.MethodPost:
		var input services.PlacementInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.CreatePlacement(r.Context(), input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, item)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handlePlacement(w http.ResponseWriter, r *http.Request, deps Deps) {
	id, err := parseID(r.URL.Path, "/api/service_placements/")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input services.PlacementInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "invalid json payload", http.StatusBadRequest)
			return
		}
		item, err := deps.UpdatePlacement(r.Context(), id, input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, item)
	case http.MethodDelete:
		if err := deps.DeletePlacement(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
