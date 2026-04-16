CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '["view"]'::jsonb,
    is_builtin BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    user_segment TEXT,
    password_hash TEXT
);

CREATE TABLE dashboard_templates (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    blocks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    space_type VARCHAR(30) NOT NULL DEFAULT 'audience',
    provisioning_state VARCHAR(20) NOT NULL DEFAULT 'active',
    parent_id INT REFERENCES spaces(id) ON DELETE SET NULL,
    dashboard_template_id INT REFERENCES dashboard_templates(id) ON DELETE SET NULL,
    access_mode VARCHAR(30) NOT NULL DEFAULT 'private',
    is_default_public_entry BOOLEAN NOT NULL DEFAULT false,
    layout_mode VARCHAR(20) NOT NULL DEFAULT 'grid',
    background_url TEXT,
    is_lockable BOOLEAN NOT NULL DEFAULT true,
    visibility_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    display_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    personalization_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    public_entry JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_provisioned BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT spaces_provisioning_state_valid
        CHECK (provisioning_state IN ('active', 'archived')),
    CONSTRAINT spaces_default_public_entry_requires_public
        CHECK (NOT is_default_public_entry OR access_mode = 'public_readonly')
);

CREATE TABLE memberships (
    principal_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE user_preferences (
    principal_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    hidden_block_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    block_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT REFERENCES spaces(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    entity_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE directory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL DEFAULT 'resource',
    key TEXT,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    url TEXT,
    pinned BOOLEAN NOT NULL DEFAULT false,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    audience_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    service_type TEXT,
    owners_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    links_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    endpoints_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    tier TEXT,
    lifecycle TEXT,
    access_path TEXT,
    runbook_url TEXT,
    classification TEXT,
    depends_on_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memberships_space ON memberships(space_id);
CREATE INDEX idx_memberships_role ON memberships(role_id);
CREATE INDEX idx_activity_space ON activity_events(space_id);
CREATE INDEX idx_directory_space ON directory_items(space_id);
CREATE UNIQUE INDEX idx_directory_space_key ON directory_items(space_id, key);
CREATE INDEX idx_spaces_parent ON spaces(parent_id);
CREATE UNIQUE INDEX spaces_single_default_public_entry_idx
    ON spaces ((1))
    WHERE is_default_public_entry;

INSERT INTO roles (key, name, permissions, is_builtin)
VALUES
    ('admin', 'Admin', '["view","manage"]'::jsonb, true),
    ('user', 'User', '["view"]'::jsonb, true),
    ('guest', 'Guest', '["view"]'::jsonb, true)
ON CONFLICT (key) DO NOTHING;
