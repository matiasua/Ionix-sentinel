CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Esquema único de "finding": mismo shape sin importar si el hallazgo
-- viene del analizador de código o (Fase 2) del analizador de logs.
CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  pci_requirement TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('code', 'log')),

  -- Campos del motor de reglas / analizador (rule_id apunta a un id en
  -- rules/pci-rules.yaml, NO a una tabla — las reglas viven en YAML).
  rule_id TEXT,
  file_path TEXT,
  line_number INTEGER,
  snippet TEXT,

  -- Campos generados por el motor de razonamiento (Claude).
  explanation TEXT,
  remediation TEXT,
  reasoning_status TEXT NOT NULL DEFAULT 'ok' CHECK (reasoning_status IN ('ok', 'error')),

  -- Estado del hallazgo en el dashboard.
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive')),

  -- A qué corrida de análisis pertenece (no hay tabla `scans` separada;
  -- el resumen de una corrida se agrega agrupando findings por scan_id).
  scan_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings (scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity);
CREATE INDEX IF NOT EXISTS idx_findings_source ON findings (source);
