package httpapi

import (
	"io"
	"net/http"
	"net/url"
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

	target, err := url.Parse(strings.TrimRight(baseURL, "/") + "/shopping/summary")
	if err != nil {
		http.Error(w, "invalid shopping api url", http.StatusInternalServerError)
		return
	}

	query := target.Query()
	for key, values := range r.URL.Query() {
		for _, value := range values {
			query.Add(key, value)
		}
	}
	target.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, target.String(), nil)
	if err != nil {
		http.Error(w, "failed to prepare shopping request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/json")
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
