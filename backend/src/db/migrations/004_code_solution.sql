-- Solución de código on-demand (botón "Generar solución" en el detalle de un
-- hallazgo, ver frontend/src/views/FindingDetail.tsx). A diferencia de
-- explanation/remediation (generados en bulk durante el scan), esto se
-- genera bajo demanda cuando el usuario lo pide y se persiste para no
-- volver a gastar tokens si vuelve a esa vista. Columnas aditivas y
-- nullable — no rompen datos existentes ni el contrato de `Finding`.
--
-- Uso:
--   docker exec -i ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel \
--     < backend/src/db/migrations/004_code_solution.sql

ALTER TABLE findings ADD COLUMN IF NOT EXISTS code_solution_before      TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS code_solution_after       TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS code_solution_explanation TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS code_solution_status      TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS code_solution_generated_at TIMESTAMPTZ;

ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_code_solution_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_code_solution_status_check
  CHECK (code_solution_status IS NULL OR code_solution_status IN ('ok', 'error'));
