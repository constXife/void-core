package httpapi

import (
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

func handleShoppingSummary(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	baseURL := strings.TrimSpace(deps.ShoppingAPIBaseURL)
	token := strings.TrimSpace(deps.ShoppingAPIToken)
	if baseURL == "" || token == "" {
		http.Error(w, "shopping api not configured", http.StatusServiceUnavailable)
		return
	}

	target, err := shoppingTargetURL(baseURL, "/shopping/summary")
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingRuns(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), "/shopping/runs")
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingIntents(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), "/shopping/intents")
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingIntent(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	intentID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/shopping/intents/"))
	if intentID == "" || strings.Contains(intentID, "/") {
		http.NotFound(w, r)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), path.Join("/shopping/intents", intentID))
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingRun(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	runID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/shopping/runs/"))
	if runID == "" || strings.Contains(runID, "/") {
		http.NotFound(w, r)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), path.Join("/shopping/runs", runID))
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingItems(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), "/shopping/items")
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func handleShoppingItem(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	itemID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/shopping/items/"))
	if itemID == "" || strings.Contains(itemID, "/") {
		http.NotFound(w, r)
		return
	}

	target, err := shoppingTargetURL(strings.TrimSpace(deps.ShoppingAPIBaseURL), path.Join("/shopping/items", itemID))
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, target)
}

func shoppingTargetURL(baseURL string, suffix string) (*url.URL, error) {
	if baseURL == "" {
		return nil, url.InvalidHostError("")
	}
	target, err := url.Parse(strings.TrimRight(baseURL, "/") + suffix)
	if err != nil {
		return nil, err
	}
	return target, nil
}

func proxyKnowledgeRequest(w http.ResponseWriter, r *http.Request, deps Deps, target *url.URL) {
	token := strings.TrimSpace(deps.ShoppingAPIToken)
	if strings.TrimSpace(deps.ShoppingAPIBaseURL) == "" || token == "" {
		http.Error(w, "shopping api not configured", http.StatusServiceUnavailable)
		return
	}

	query := target.Query()
	for key, values := range r.URL.Query() {
		for _, value := range values {
			query.Add(key, value)
		}
	}
	target.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(r.Context(), r.Method, target.String(), r.Body)
	if err != nil {
		http.Error(w, "failed to prepare shopping request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/json")
	if contentType := strings.TrimSpace(r.Header.Get("Content-Type")); contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := deps.ShoppingHTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(req)
	if err != nil {
		http.Error(w, "shopping api unavailable", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	if contentType := strings.TrimSpace(res.Header.Get("Content-Type")); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.WriteHeader(res.StatusCode)
	_, _ = io.Copy(w, res.Body)
}
