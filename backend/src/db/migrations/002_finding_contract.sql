-- Alinea la tabla `findings` con el contrato de datos final (docs/07-backend-spec.docs.md §3):
-- elimina el campo `description` (no forma parte del esquema Finding que consume el
-- frontend) y hace obligatorios los campos que el analizador siempre produce.
--
-- Uso:
--   docker exec -i ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel \
--     < backend/src/db/migrations/002_finding_contract.sql

-- Backfill defensivo por si hay filas de pruebas creadas con el scaffold viejo
-- (antes de que rule_id/file_path/snippet fueran obligatorios).
UPDATE findings SET rule_id = 'UNKNOWN' WHERE rule_id IS NULL;
UPDATE findings SET file_path = 'UNKNOWN' WHERE file_path IS NULL;
UPDATE findings SET snippet = '' WHERE snippet IS NULL;

ALTER TABLE findings ALTER COLUMN rule_id SET NOT NULL;
ALTER TABLE findings ALTER COLUMN file_path SET NOT NULL;
ALTER TABLE findings ALTER COLUMN snippet SET NOT NULL;

ALTER TABLE findings DROP COLUMN IF EXISTS description;
