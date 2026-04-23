CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO app_config (key, value) VALUES
  ('owner_name',        'Mamá'),
  ('alert_days_before', '3')
ON CONFLICT (key) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all storage operations"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');
