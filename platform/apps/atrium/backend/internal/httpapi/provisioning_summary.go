package httpapi

import (
	"net/http"
	"strings"
)

func handleProvisioningSummary(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	baseURL := strings.TrimSpace(deps.ShoppingAPIBaseURL)
	token := strings.TrimSpace(deps.ShoppingAPIToken)
	if baseURL == "" || token == "" {
		http.Error(w, "knowledge api not configured", http.StatusServiceUnavailable)
		return
	}

	target, err := shoppingTargetURL(baseURL, "/atrium/provisioning/summary")
	if err != nil {
		http.Error(w, "invalid knowledge api url", http.StatusInternalServerError)
		return
	}

	proxyKnowledgeRequest(w, r, deps, target)
}
