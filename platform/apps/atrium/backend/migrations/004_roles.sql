CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '["view"]',
    is_builtin BOOLEAN DEFAULT false
);

INSERT INTO roles (key, name, permissions, is_builtin)
VALUES
    ('admin', 'Admin', '["view","manage"]', true),
    ('user', 'User', '["view"]', true),
    ('guest', 'Guest', '["view"]', true)
ON CONFLICT (key) DO NOTHING;
