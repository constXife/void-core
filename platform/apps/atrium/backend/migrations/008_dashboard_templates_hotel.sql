INSERT INTO dashboard_templates (key, version, blocks_json, created_at)
VALUES
  (
    'hotel-shared',
    1,
    '[]',
    NOW()
  ),
  (
    'hotel-guest',
    1,
    '[]',
    NOW()
  ),
  (
    'hotel-kids',
    1,
    '[]',
    NOW()
  )
ON CONFLICT (key) DO NOTHING;
