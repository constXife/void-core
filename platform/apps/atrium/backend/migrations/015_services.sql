CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    service_type TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    owners_json JSONB DEFAULT '{}'::jsonb,
    links_json JSONB DEFAULT '{}'::jsonb,
    endpoints_json JSONB DEFAULT '[]'::jsonb,
    tier TEXT,
    lifecycle TEXT,
    classification TEXT,
    depends_on_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_placements (
    id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    label TEXT,
    pinned BOOLEAN DEFAULT false,
    sort_order INT,
    group_label TEXT,
    audience_groups JSONB DEFAULT '[]'::jsonb,
    allowed_actions JSONB DEFAULT '[]'::jsonb,
    visible_links JSONB DEFAULT '[]'::jsonb,
    primary_url TEXT,
    default_endpoint TEXT,
    access_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (service_id, space_id)
);

CREATE INDEX service_placements_space_id_idx ON service_placements(space_id);
