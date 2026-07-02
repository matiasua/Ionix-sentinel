# 04 · Base de datos

## Nombre de la base de datos

`ionix_sentinel` (definida por `POSTGRES_DB` en `.env`).

## Tabla inicial: `findings`

Definida en `backend/src/db/init.sql`:

```sql
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
```

Se usa `pgcrypto` (`gen_random_uuid()`) para generar los IDs automáticamente.

## Persistencia

Los datos se guardan en el volumen Docker nombrado `ionix_postgres_data`. Esto significa que los datos **sobreviven** a:

- Reinicios de contenedor (`docker compose restart`).
- `docker compose down` (sin `-v`).

Los datos **se pierden** con:

- `docker compose down -v` (borra volúmenes).

## Cómo conectarse desde un cliente externo

Con cualquier cliente PostgreSQL (TablePlus, DBeaver, psql, etc.), usando los valores de `.env`:

```
host:     localhost
port:     5432
database: ionix_sentinel
user:     sentinel_user
password: sentinel_password
```

Con `psql` directo:

```bash
psql "postgresql://sentinel_user:sentinel_password@localhost:5432/ionix_sentinel"
```

O entrando al contenedor:

```bash
docker exec -it ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel
```

## Cómo agregar futuras migraciones manuales durante el hackathon

El `init.sql` **solo se ejecuta la primera vez** que se crea el volumen de Postgres (comportamiento estándar de la imagen oficial de `postgres` con `/docker-entrypoint-initdb.d`). Si necesitas cambiar el esquema después de que el volumen ya existe, hay dos formas simples (dado el contexto de hackathon, no se usa un framework de migraciones):

**Opción A — reiniciar el volumen (destruye datos):**

```bash
docker compose down -v
# editar backend/src/db/init.sql con el nuevo esquema
docker compose up --build
```

**Opción B — aplicar el cambio a mano sin perder datos:**

```bash
docker exec -it ionix-sentinel-postgres psql -U sentinel_user -d ionix_sentinel \
  -c "ALTER TABLE findings ADD COLUMN status TEXT DEFAULT 'open';"
```

Recomendación: si el cambio es importante para todo el equipo, también actualiza `init.sql` para que quede documentado, aunque el volumen actual no lo vuelva a ejecutar.
