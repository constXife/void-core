package portal

import "encoding/json"

type SpaceSummary struct {
	ID                   int             `json:"id"`
	Title                string          `json:"title"`
	Slug                 string          `json:"slug"`
	Type                 string          `json:"type"`
	ParentID             *int            `json:"parent_id,omitempty"`
	DashboardTemplateID  *int            `json:"dashboard_template_id,omitempty"`
	AccessMode           string          `json:"access_mode"`
	IsDefaultPublicEntry bool            `json:"is_default_public_entry"`
	LayoutMode           string          `json:"layout_mode"`
	BackgroundURL        string          `json:"background_url"`
	IsLockable           bool            `json:"is_lockable"`
	VisibilityGroups     json.RawMessage `json:"visibility_groups"`
	DisplayConfig        json.RawMessage `json:"display_config"`
	PersonalizationRules json.RawMessage `json:"personalization_rules"`
	PublicEntry          json.RawMessage `json:"public_entry"`
}

type TemplatePayload struct {
	ID      int             `json:"id"`
	Key     string          `json:"key"`
	Version int             `json:"version"`
	Blocks  json.RawMessage `json:"blocks"`
}

type TemplateSummary struct {
	ID      int    `json:"id"`
	Key     string `json:"key"`
	Version int    `json:"version"`
}

type PreferencesPayload struct {
	HiddenBlockIDs json.RawMessage `json:"hidden_block_ids"`
	BlockOrder     json.RawMessage `json:"block_order"`
}

type DashboardPayload struct {
	Space       SpaceSummary       `json:"space"`
	Template    TemplatePayload    `json:"template"`
	Preferences PreferencesPayload `json:"preferences"`
	MobileOrder json.RawMessage    `json:"mobile_order"`
}

type DashboardSaveInput struct {
	Blocks         json.RawMessage `json:"blocks,omitempty"`
	HiddenBlockIDs json.RawMessage `json:"hidden_block_ids,omitempty"`
	BlockOrder     json.RawMessage `json:"block_order,omitempty"`
}

type BlockDescriptor struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type ActionInvokeInput struct {
	ActionKey string         `json:"action_key"`
	Params    map[string]any `json:"params,omitempty"`
	SpaceID   *int           `json:"space_id,omitempty"`
}

type ActionInvokeResult struct {
	Status  string `json:"status"`
	AuditID string `json:"audit_id,omitempty"`
}
