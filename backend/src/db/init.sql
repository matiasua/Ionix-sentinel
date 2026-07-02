CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  pci_requirement TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('code', 'log')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
