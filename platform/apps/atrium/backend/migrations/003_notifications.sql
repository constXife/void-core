-- Business notifications system
-- Stores notifications from external sources (Home Assistant, Sonarr, etc.)

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(20) DEFAULT 'business',  -- 'business', 'tech'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    icon VARCHAR(50),                          -- emoji or lucide icon name
    image_url TEXT,                            -- snapshot from camera
    service_key VARCHAR(100),                  -- link to service (optional)
    
    -- Actions (interactive buttons)
    actions JSONB DEFAULT '[]',                -- [{"id":"ok","label":"Иду!","style":"primary"}]
    callback_url TEXT,                         -- POST back to Home Assistant
    
    -- State
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                    -- auto-dismiss after (NULL = 24h default)
    
    -- Deduplication
    dedup_key VARCHAR(255)                     -- optional key for updating existing notifications
);

-- Indexes for common queries
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_active ON notifications(is_dismissed, expires_at) 
    WHERE is_dismissed = false;
CREATE INDEX idx_notifications_dedup ON notifications(dedup_key) 
    WHERE dedup_key IS NOT NULL;

-- Add badge_count to services widget_data (already JSONB, no schema change needed)
-- Example: UPDATE services SET widget_data = widget_data || '{"badge_count": 5}' WHERE key = 'jira';



