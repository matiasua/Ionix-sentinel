-- Metadata de scan por rama para la demo del selector "Repositorio".
-- `category` clasifica el hallazgo (codigo | libreria | pci_compliance) y `branch`
-- guarda qué opción del dropdown lo generó. Ambas columnas son aditivas y
-- nullable — no rompen datos existentes ni el contrato de `Finding`.
--
-- Uso:
--   docker exec -i ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel \
--     < backend/src/db/migrations/003_scan_metadata.sql

ALTER TABLE findings ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS branch   TEXT;

CREATE INDEX IF NOT EXISTS idx_findings_branch ON findings (branch);
