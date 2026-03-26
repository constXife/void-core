INSERT INTO dashboard_templates (key, version, blocks_json, created_at)
VALUES
  (
    'admin',
    1,
    '[]',
    NOW()
  ),
  (
    'user',
    1,
    '[]',
    NOW()
  ),
  (
    'guest',
    1,
    '[]',
    NOW()
  )
ON CONFLICT (key) DO NOTHING;
