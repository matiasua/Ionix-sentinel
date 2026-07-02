-- Migración aditiva para volúmenes de Postgres que ya existen (init.sql
-- solo corre la primera vez que se crea el volumen). Aplica los mismos
-- cambios que ya están en db/init.sql, de forma idempotente y sin
-- pérdida de datos.
--
-- Uso:
--   docker exec -i ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel \
--     < backend/src/db/migrations/001_extend_findings.sql

ALTER TABLE findings ADD COLUMN IF NOT EXISTS rule_id          TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS file_path        TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS line_number      INTEGER;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS snippet          TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS explanation      TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS remediation      TEXT;

ALTER TABLE findings ADD COLUMN IF NOT EXISTS reasoning_status TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_reasoning_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_reasoning_status_check
  CHECK (reasoning_status IN ('ok', 'error'));

ALTER TABLE findings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_status_check
  CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive'));

ALTER TABLE findings ADD COLUMN IF NOT EXISTS scan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings (scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity);
CREATE INDEX IF NOT EXISTS idx_findings_source ON findings (source);
