package httpapi

import (
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"atrium/internal/foundation/webauth"
)

const knowledgeAuthSubjectHeader = "X-Void-Auth-Subject"
const knowledgeUserEmailHeader = "X-Void-User-Email"
const knowledgeUserRoleHeader = "X-Void-User-Role"

type knowledgePathRewrite struct {
	pattern     *regexp.Regexp
	replacement string
}

var inventoryPublishedPathRewrites = []knowledgePathRewrite{
	{pattern: regexp.MustCompile(`/inventory/lifecycle/bulk/page`), replacement: `/lifecycle/bulk`},
	{pattern: regexp.MustCompile(`/inventory/dashboard/page`), replacement: `/dashboard`},
	{pattern: regexp.MustCompile(`/inventory/create/page`), replacement: `/create`},
	{pattern: regexp.MustCompile(`/inventory/bulk/page`), replacement: `/bulk`},
	{pattern: regexp.MustCompile(`/inventory/storage/([^/?#]+)/edit/page`), replacement: `/storage/$1/edit`},
	{pattern: regexp.MustCompile(`/inventory/storage/([^/?#]+)/move/page`), replacement: `/storage/$1/move`},
	{pattern: regexp.MustCompile(`/inventory/storage/([^/?#]+)/delete/page`), replacement: `/storage/$1/delete`},
	{pattern: regexp.MustCompile(`/inventory/storage/([^/?#]+)/lifecycle/page`), replacement: `/storage/$1/lifecycle`},
	{pattern: regexp.MustCompile(`/inventory/storage/([^/?#]+)/page`), replacement: `/storage/$1`},
	{pattern: regexp.MustCompile(`/inventory/items/([^/?#]+)/edit/page`), replacement: `/items/$1/edit`},
	{pattern: regexp.MustCompile(`/inventory/items/([^/?#]+)/move/page`), replacement: `/items/$1/move`},
	{pattern: regexp.MustCompile(`/inventory/items/([^/?#]+)/delete/page`), replacement: `/items/$1/delete`},
	{pattern: regexp.MustCompile(`/inventory/items/([^/?#]+)/lifecycle/page`), replacement: `/items/$1/lifecycle`},
	{pattern: regexp.MustCompile(`/inventory/items/([^/?#]+)/page`), replacement: `/items/$1`},
	{pattern: regexp.MustCompile(`/inventory/forms/`), replacement: `/forms/`},
}

var financePublishedPathRewrites = []knowledgePathRewrite{
	{pattern: regexp.MustCompile(`/finance/dashboard/page`), replacement: `/dashboard`},
	{pattern: regexp.MustCompile(`/finance/ingest/page`), replacement: `/ingest`},
	{pattern: regexp.MustCompile(`/finance/statements/([^/?#]+)/page`), replacement: `/statements/$1`},
	{pattern: regexp.MustCompile(`/finance/forms/`), replacement: `/forms/`},
}

func handleKnowledgeHostRequest(w http.ResponseWriter, r *http.Request, deps Deps, surface string) {
	handleKnowledgeRequest(w, r, deps, surface, r.URL.Path, false)
}

func handlePublishedKnowledgeHostRequest(w http.ResponseWriter, r *http.Request, deps Deps, surface string) {
	if publishedKnowledgeSurfaceFromHost(r) != surface {
		http.NotFound(w, r)
		return
	}
	if hasLegacyPublishedKnowledgePrefix(r.URL.Path, surface) {
		http.NotFound(w, r)
		return
	}
	targetPath, ok := canonicalPublishedKnowledgeTargetPath(surface, r.URL.Path)
	if !ok {
		http.NotFound(w, r)
		return
	}
	handleKnowledgeRequest(w, r, deps, surface, targetPath, true)
}

func handleKnowledgeRequest(
	w http.ResponseWriter,
	r *http.Request,
	deps Deps,
	surface string,
	targetPath string,
	rewritePublishedHost bool,
) {
	if redirectTarget, ok := canonicalKnowledgeHostRedirect(r, deps, surface, rewritePublishedHost); ok {
		http.Redirect(w, r, redirectTarget, http.StatusFound)
		return
	}
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
	target, err := knowledgeTargetURL(strings.TrimSpace(deps.KnowledgeProxyBaseURL), targetPath)
	if err != nil {
		http.Error(w, "invalid knowledge proxy url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, session, target, surface, rewritePublishedHost)
}

func canonicalKnowledgeHostRedirect(
	r *http.Request,
	deps Deps,
	surface string,
	rewritePublishedHost bool,
) (string, bool) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return "", false
	}
	switch surface {
	case "inventory":
		targetPath := "/inventory/dashboard/page"
		redirectPath := targetPath
		if rewritePublishedHost {
			targetPath = "/dashboard"
			redirectPath = targetPath
			if r.URL.Path == "/" {
				query := r.URL.Query()
				defaultSlice := strings.TrimSpace(deps.InventoryDefaultSlice)
				if defaultSlice == "" {
					defaultSlice = "pantry"
				}
				query.Set("slice", defaultSlice)
				encoded := query.Encode()
				if encoded != "" {
					redirectPath += "?" + encoded
				}
				return redirectPath, true
			}
		}
		if r.URL.Path != targetPath {
			return "", false
		}
		if strings.TrimSpace(r.URL.Query().Get("slice")) != "" {
			return "", false
		}
		defaultSlice := strings.TrimSpace(deps.InventoryDefaultSlice)
		if defaultSlice == "" {
			defaultSlice = "pantry"
		}
		query := r.URL.Query()
		query.Set("slice", defaultSlice)
		encoded := query.Encode()
		if encoded != "" {
			redirectPath += "?" + encoded
		}
		return redirectPath, true
	case "finance":
		if rewritePublishedHost && r.URL.Path == "/" {
			return "/dashboard", true
		}
	}
	return "", false
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
	rewritePublishedHost bool,
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

	copyProxyHeaders(w.Header(), res.Header, surface, rewritePublishedHost)
	if rewritePublishedHost && isHTMLResponse(res.Header) {
		body, err := io.ReadAll(res.Body)
		if err != nil {
			http.Error(w, "failed to read knowledge response", http.StatusBadGateway)
			return
		}
		rewritten := rewritePublishedKnowledgeBody(surface, body)
		w.Header().Set("Content-Length", strconv.Itoa(len(rewritten)))
		w.WriteHeader(res.StatusCode)
		_, _ = w.Write(rewritten)
		return
	}
	w.WriteHeader(res.StatusCode)
	_, _ = io.Copy(w, res.Body)
}

func copyProxyHeaders(dst http.Header, src http.Header, surface string, rewritePublishedHost bool) {
	for key, values := range src {
		if strings.EqualFold(key, "Connection") || strings.EqualFold(key, "Transfer-Encoding") {
			continue
		}
		dst.Del(key)
		for _, value := range values {
			if rewritePublishedHost && strings.EqualFold(key, "Location") {
				value = rewritePublishedKnowledgeURL(surface, value)
			}
			dst.Add(key, value)
		}
	}
}

func isHTMLResponse(header http.Header) bool {
	return strings.Contains(strings.ToLower(strings.TrimSpace(header.Get("Content-Type"))), "text/html")
}

func publishedKnowledgeSurfaceFromHost(r *http.Request) string {
	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(r.Host)
	}
	host = strings.ToLower(host)
	if index := strings.Index(host, ":"); index >= 0 {
		host = host[:index]
	}
	label := host
	if index := strings.Index(label, "."); index >= 0 {
		label = label[:index]
	}
	switch label {
	case "inventory", "finance":
		return label
	default:
		return ""
	}
}

func hasLegacyPublishedKnowledgePrefix(path string, surface string) bool {
	return strings.HasPrefix(path, "/"+surface+"/")
}

func canonicalPublishedKnowledgeTargetPath(surface string, path string) (string, bool) {
	switch surface {
	case "inventory":
		return canonicalPublishedInventoryTargetPath(path)
	case "finance":
		return canonicalPublishedFinanceTargetPath(path)
	default:
		return "", false
	}
}

func canonicalPublishedInventoryTargetPath(path string) (string, bool) {
	switch path {
	case "/", "/dashboard":
		return "/inventory/dashboard/page", true
	case "/create":
		return "/inventory/create/page", true
	case "/bulk":
		return "/inventory/bulk/page", true
	case "/lifecycle/bulk":
		return "/inventory/lifecycle/bulk/page", true
	}
	if strings.HasPrefix(path, "/forms/") {
		return "/inventory" + path, true
	}
	return canonicalPublishedInventoryEntityTargetPath(path)
}

func canonicalPublishedInventoryEntityTargetPath(path string) (string, bool) {
	trimmed := strings.Trim(path, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 {
		return "", false
	}
	switch parts[0] {
	case "storage":
		if len(parts) == 2 {
			return "/inventory/storage/" + parts[1] + "/page", true
		}
		if len(parts) == 3 {
			switch parts[2] {
			case "edit", "move", "delete", "lifecycle":
				return "/inventory/storage/" + parts[1] + "/" + parts[2] + "/page", true
			}
		}
	case "items":
		if len(parts) == 2 {
			return "/inventory/items/" + parts[1] + "/page", true
		}
		if len(parts) == 3 {
			switch parts[2] {
			case "edit", "move", "delete", "lifecycle":
				return "/inventory/items/" + parts[1] + "/" + parts[2] + "/page", true
			}
		}
	}
	return "", false
}

func canonicalPublishedFinanceTargetPath(path string) (string, bool) {
	switch path {
	case "/", "/dashboard":
		return "/finance/dashboard/page", true
	case "/ingest":
		return "/finance/ingest/page", true
	}
	if strings.HasPrefix(path, "/forms/") {
		return "/finance" + path, true
	}
	trimmed := strings.Trim(path, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) == 2 && parts[0] == "statements" {
		return "/finance/statements/" + parts[1] + "/page", true
	}
	return "", false
}

func rewritePublishedKnowledgeBody(surface string, body []byte) []byte {
	rewritten := rewritePublishedKnowledgeURL(surface, string(body))
	return []byte(rewritten)
}

func rewritePublishedKnowledgeURL(surface string, value string) string {
	switch surface {
	case "inventory":
		return applyKnowledgePathRewrites(value, inventoryPublishedPathRewrites)
	case "finance":
		return applyKnowledgePathRewrites(value, financePublishedPathRewrites)
	default:
		return value
	}
}

func applyKnowledgePathRewrites(value string, rewrites []knowledgePathRewrite) string {
	rewritten := value
	for _, rewrite := range rewrites {
		rewritten = rewrite.pattern.ReplaceAllString(rewritten, rewrite.replacement)
	}
	return rewritten
}
