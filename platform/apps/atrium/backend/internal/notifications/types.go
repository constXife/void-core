package notifications

import (
	"encoding/json"
	"time"
)

// Action represents an interactive button on a notification
type Action struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Style string `json:"style"` // "primary", "secondary", "danger"
}

// Notification represents a business notification from external sources
type Notification struct {
	ID          string    `json:"id"`
	Category    string    `json:"category"`    // "business", "tech"
	Title       string    `json:"title"`
	Message     string    `json:"message,omitempty"`
	Icon        string    `json:"icon,omitempty"`        // emoji or lucide icon name
	ImageURL    string    `json:"image_url,omitempty"`   // snapshot from camera
	ServiceKey  string    `json:"service_key,omitempty"` // link to service
	Actions     []Action  `json:"actions,omitempty"`
	CallbackURL string    `json:"callback_url,omitempty"`
	IsRead      bool      `json:"is_read"`
	IsDismissed bool      `json:"is_dismissed"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	DedupKey    string    `json:"dedup_key,omitempty"`
}

// CreateInput is the payload for creating a new notification
type CreateInput struct {
	Category    string    `json:"category"`
	Title       string    `json:"title"`
	Message     string    `json:"message,omitempty"`
	Icon        string    `json:"icon,omitempty"`
	ImageURL    string    `json:"image_url,omitempty"`
	ServiceKey  string    `json:"service_key,omitempty"`
	Actions     []Action  `json:"actions,omitempty"`
	CallbackURL string    `json:"callback_url,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	DedupKey    string    `json:"dedup_key,omitempty"`
}

// ActionCallback is the payload sent back to external systems
type ActionCallback struct {
	NotificationID string `json:"notification_id"`
	ActionID       string `json:"action_id"`
	User           string `json:"user,omitempty"`
	Timestamp      string `json:"timestamp"`
}

// WebSocket message types
type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type NotificationMessage struct {
	Type    string       `json:"type"` // "notification"
	Payload Notification `json:"payload"`
}

type BadgeUpdateMessage struct {
	Type       string `json:"type"` // "badge_update"
	ServiceKey string `json:"service_key"`
	BadgeCount int    `json:"badge_count"`
}



