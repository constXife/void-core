package httpapi

import (
	"io"
	"net/http"
	"net/url"
	"strings"

	"atrium/internal/auth"
)

const knowledgeAuthSubjectHeader = "X-Void-Auth-Subject"
const knowledgeUserEmailHeader = "X-Void-User-Email"
const knowledgeUserRoleHeader = "X-Void-User-Role"

func handleKnowledgeHostRequest(w http.ResponseWriter, r *http.Request, deps Deps, surface string) {
	session, ok := auth.UserFromContext(r.Context())
	if !ok {
		if shouldRedirectKnowledgeLogin(r) {
			http.Redirect(w, r, "/auth/login?next="+url.QueryEscape(requestURIOrPath(r)), http.StatusFound)
			return
		}
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if strings.TrimSpace(session.AuthSubject) == "" {
		http.Error(w, "auth subject bridge not configured", http.StatusServiceUnavailable)
		return
	}
	if strings.TrimSpace(deps.KnowledgeProxyBaseURL) == "" || strings.TrimSpace(deps.KnowledgeProxyToken) == "" {
		http.Error(w, "knowledge proxy not configured", http.StatusServiceUnavailable)
		return
	}
	target, err := knowledgeTargetURL(strings.TrimSpace(deps.KnowledgeProxyBaseURL), r.URL.Path)
	if err != nil {
		http.Error(w, "invalid knowledge proxy url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, session, target, surface)
}

func shouldRedirectKnowledgeLogin(r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	if strings.HasSuffix(r.URL.Path, "/page") {
		return true
	}
	accept := strings.ToLower(strings.TrimSpace(r.Header.Get("Accept")))
	return accept == "" || strings.Contains(accept, "text/html")
}

func requestURIOrPath(r *http.Request) string {
	if strings.TrimSpace(r.URL.RequestURI()) != "" {
		return r.URL.RequestURI()
	}
	if strings.TrimSpace(r.URL.Path) != "" {
		return r.URL.Path
	}
	return "/"
}

func knowledgeTargetURL(baseURL string, requestPath string) (*url.URL, error) {
	if baseURL == "" {
		return nil, url.InvalidHostError("")
	}
	target, err := url.Parse(strings.TrimRight(baseURL, "/") + requestPath)
	if err != nil {
		return nil, err
	}
	return target, nil
}

func proxyKnowledgeRequest(
	w http.ResponseWriter,
	r *http.Request,
	deps Deps,
	session auth.Session,
	target *url.URL,
	surface string,
) {
	query := target.Query()
	for key, values := range r.URL.Query() {
		query.Del(key)
		for _, value := range values {
			query.Add(key, value)
		}
	}
	target.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(r.Context(), r.Method, target.String(), r.Body)
	if err != nil {
		http.Error(w, "failed to prepare knowledge request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(deps.KnowledgeProxyToken))
	req.Header.Set(knowledgeAuthSubjectHeader, strings.TrimSpace(session.AuthSubject))
	req.Header.Set(knowledgeUserEmailHeader, strings.TrimSpace(session.Email))
	req.Header.Set(knowledgeUserRoleHeader, strings.TrimSpace(session.Role))
	req.Header.Set("X-Forwarded-Host", r.Host)
	if forwardedProto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwardedProto != "" {
		req.Header.Set("X-Forwarded-Proto", forwardedProto)
	}
	if accept := strings.TrimSpace(r.Header.Get("Accept")); accept != "" {
		req.Header.Set("Accept", accept)
	}
	if contentType := strings.TrimSpace(r.Header.Get("Content-Type")); contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if strings.TrimSpace(surface) != "" {
		req.Header.Set("X-Void-Surface", surface)
	}

	client := deps.KnowledgeProxyHTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(req)
	if err != nil {
		http.Error(w, "knowledge proxy unavailable", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	copyProxyHeaders(w.Header(), res.Header)
	w.WriteHeader(res.StatusCode)
	_, _ = io.Copy(w, res.Body)
}

func copyProxyHeaders(dst http.Header, src http.Header) {
	for key, values := range src {
		if strings.EqualFold(key, "Connection") || strings.EqualFold(key, "Transfer-Encoding") {
			continue
		}
		dst.Del(key)
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}
