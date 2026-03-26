package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"atrium/internal/auth"
	"atrium/internal/notifications"
)

// NotificationDeps contains dependencies for notification handlers
type NotificationDeps struct {
	Store     *notifications.Store
	Broadcast func(msg any) // WebSocket broadcast function
	Auth      *auth.Manager
}

// handleNotify handles POST /api/notify - create a new notification
func handleNotify(w http.ResponseWriter, r *http.Request, deps NotificationDeps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input notifications.CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if input.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	// Validate category
	if input.Category != "" && input.Category != "business" && input.Category != "tech" {
		http.Error(w, "category must be 'business' or 'tech'", http.StatusBadRequest)
		return
	}

	// Validate actions
	for i, action := range input.Actions {
		if action.ID == "" || action.Label == "" {
			http.Error(w, fmt.Sprintf("action %d: id and label are required", i), http.StatusBadRequest)
			return
		}
		if action.Style != "" && action.Style != "primary" && action.Style != "secondary" && action.Style != "danger" {
			http.Error(w, fmt.Sprintf("action %d: style must be 'primary', 'secondary', or 'danger'", i), http.StatusBadRequest)
			return
		}
	}

	// Set default expiry if not provided
	if input.ExpiresAt == nil {
		expiry := notifications.DefaultExpiry()
		input.ExpiresAt = &expiry
	}

	// Insert notification
	notif, err := deps.Store.Insert(r.Context(), input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Broadcast via WebSocket
	if deps.Broadcast != nil {
		deps.Broadcast(notifications.NotificationMessage{
			Type:    "notification",
			Payload: notif,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(notif)
}

// handleNotifications handles GET /api/notifications - list notifications
func handleNotifications(w http.ResponseWriter, r *http.Request, deps NotificationDeps) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	category := r.URL.Query().Get("category")
	limit := 20 // default

	notifs, err := deps.Store.List(r.Context(), category, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if notifs == nil {
		notifs = []notifications.Notification{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

// handleNotificationAction handles POST /api/notifications/:id/action
func handleNotificationAction(w http.ResponseWriter, r *http.Request, deps NotificationDeps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse notification ID from path
	path := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "action" {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	notifID := parts[0]

	var payload struct {
		ActionID string `json:"action_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid json payload", http.StatusBadRequest)
		return
	}

	if payload.ActionID == "" {
		http.Error(w, "action_id is required", http.StatusBadRequest)
		return
	}

	// Get notification
	notif, err := deps.Store.GetByID(r.Context(), notifID)
	if err != nil {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	// Validate action exists
	actionValid := false
	for _, action := range notif.Actions {
		if action.ID == payload.ActionID {
			actionValid = true
			break
		}
	}
	if !actionValid {
		http.Error(w, "invalid action_id", http.StatusBadRequest)
		return
	}

	// Mark as read and dismissed
	if err := deps.Store.MarkDismissed(r.Context(), notifID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get user email if authenticated
	userEmail := ""
	if session, ok := auth.UserFromContext(r.Context()); ok {
		userEmail = session.Email
	}

	// Send callback to external system
	if notif.CallbackURL != "" {
		go sendCallback(notif.CallbackURL, notifications.ActionCallback{
			NotificationID: notifID,
			ActionID:       payload.ActionID,
			User:           userEmail,
			Timestamp:      time.Now().UTC().Format(time.RFC3339),
		})
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleNotificationDismiss handles POST /api/notifications/:id/dismiss
func handleNotificationDismiss(w http.ResponseWriter, r *http.Request, deps NotificationDeps) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse notification ID from path
	path := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "dismiss" {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	notifID := parts[0]

	if err := deps.Store.MarkDismissed(r.Context(), notifID); err != nil {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// sendCallback sends action callback to external system
func sendCallback(url string, callback notifications.ActionCallback) {
	body, err := json.Marshal(callback)
	if err != nil {
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Atrium/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
}


