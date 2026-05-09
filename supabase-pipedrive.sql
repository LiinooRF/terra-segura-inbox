-- Agregar al schema de Supabase (ejecutar en SQL Editor)
CREATE TABLE IF NOT EXISTS pipedrive_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pipedrive_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pipedrive_tokens FOR ALL USING (true) WITH CHECK (true);
