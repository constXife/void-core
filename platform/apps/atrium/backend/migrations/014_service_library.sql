ALTER TABLE directory_items
  ADD COLUMN service_type text,
  ADD COLUMN owners_json jsonb,
  ADD COLUMN links_json jsonb,
  ADD COLUMN endpoints_json jsonb,
  ADD COLUMN tier text,
  ADD COLUMN lifecycle text,
  ADD COLUMN access_path text,
  ADD COLUMN runbook_url text,
  ADD COLUMN classification text,
  ADD COLUMN depends_on_json jsonb;
