package httpapi

import (
	"net/http"
	"strings"

	"atrium/internal/auth"
)

const calendarKnowledgeSurface = "calendar"

func handleCalendarEvents(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	proxyCalendarKnowledgeRequest(w, r, deps, "/api/knowledge/v1/calendar/events")
}

func handleCalendarUpcoming(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	proxyCalendarKnowledgeRequest(w, r, deps, "/api/knowledge/v1/calendar/upcoming")
}

func handleCalendarFeed(w http.ResponseWriter, r *http.Request, deps Deps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	proxyCalendarKnowledgeRequest(w, r, deps, "/api/knowledge/v1/calendar/feed.ics")
}

func proxyCalendarKnowledgeRequest(
	w http.ResponseWriter,
	r *http.Request,
	deps Deps,
	targetPath string,
) {
	session, ok := auth.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if strings.TrimSpace(deps.KnowledgeProxyBaseURL) == "" || strings.TrimSpace(deps.KnowledgeProxyToken) == "" {
		http.Error(w, "calendar api not configured", http.StatusServiceUnavailable)
		return
	}
	target, err := knowledgeTargetURL(strings.TrimSpace(deps.KnowledgeProxyBaseURL), targetPath)
	if err != nil {
		http.Error(w, "invalid calendar api url", http.StatusInternalServerError)
		return
	}
	proxyKnowledgeRequest(w, r, deps, session, target, calendarKnowledgeSurface, false)
}
