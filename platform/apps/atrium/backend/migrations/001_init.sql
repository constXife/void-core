CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    slug VARCHAR(50) UNIQUE,
    layout_mode VARCHAR(20) DEFAULT 'grid',
    background_url TEXT,
    is_lockable BOOLEAN DEFAULT true,
    visibility_groups JSONB DEFAULT '[]',
    display_config JSONB DEFAULT '{}', -- Extra visual config
    is_provisioned BOOLEAN DEFAULT false
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,          -- For idempotency (ansible id)

    -- Base
    title VARCHAR(100),
    url TEXT,
    logo_url TEXT,
    space_id INT REFERENCES spaces(id),

    -- Discovery & Status
    source VARCHAR(20) DEFAULT 'manual', -- 'nix', 'labels', 'api', 'manual', 'fixture'
    status VARCHAR(20) DEFAULT 'active', -- 'inbox', 'active', 'archived'

    -- Widget Engine
    widget_type VARCHAR(50) DEFAULT 'ping',   -- 'ping', 'none' (for now)
    widget_config JSONB DEFAULT '{}',         -- {"check_url": "http://...", "interval": 60}
    widget_data JSONB DEFAULT '{}',           -- {"online": true, "latency": 45}

    is_provisioned BOOLEAN DEFAULT false,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (OIDC Auto-provisioning)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(20) DEFAULT 'user', -- 'admin' can approve from Inbox
    workspace_config JSONB DEFAULT '{}' -- Personal Dock and settings
);
