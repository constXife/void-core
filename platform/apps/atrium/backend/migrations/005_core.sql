-- Core portal schema (roles already defined in 004_roles.sql)

CREATE TABLE IF NOT EXISTS memberships (
    principal_id UUID REFERENCES users(id),
    space_id INT REFERENCES spaces(id),
    role_id INT REFERENCES roles(id),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE IF NOT EXISTS dashboard_templates (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    version INT DEFAULT 1,
    blocks_json JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    principal_id UUID REFERENCES users(id),
    space_id INT REFERENCES spaces(id),
    hidden_block_ids JSONB DEFAULT '[]',
    block_order JSONB DEFAULT '[]',
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    external_ref TEXT,
    label TEXT
);

CREATE TABLE IF NOT EXISTS stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id UUID REFERENCES users(id),
    unit_id INT REFERENCES units(id),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT REFERENCES spaces(id),
    priority VARCHAR(20) DEFAULT 'normal',
    title TEXT NOT NULL,
    body TEXT,
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT REFERENCES spaces(id),
    created_by UUID REFERENCES users(id),
    unit_id INT REFERENCES units(id),
    stay_id UUID REFERENCES stays(id),
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT REFERENCES spaces(id),
    actor_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    entity_ref JSONB DEFAULT '{}',
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS directory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INT REFERENCES spaces(id),
    type VARCHAR(30) DEFAULT 'resource',
    key VARCHAR(100),
    title TEXT NOT NULL,
    url TEXT,
    pinned BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    action_keys JSONB DEFAULT '[]',
    health_check_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_space ON memberships(space_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role_id);
CREATE INDEX IF NOT EXISTS idx_stays_principal ON stays(principal_id);
CREATE INDEX IF NOT EXISTS idx_stays_unit ON stays(unit_id);
CREATE INDEX IF NOT EXISTS idx_announcements_space ON announcements(space_id);
CREATE INDEX IF NOT EXISTS idx_tickets_space ON tickets(space_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activity_space ON activity_events(space_id);
CREATE INDEX IF NOT EXISTS idx_directory_space ON directory_items(space_id);
