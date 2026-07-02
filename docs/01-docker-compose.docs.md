# 01 · Docker Compose

## Servicios incluidos

| Servicio   | Descripción                          | Puerto host |
|------------|---------------------------------------|-------------|
| `frontend` | React + Vite (dev server con HMR)     | 5173        |
| `backend`  | Node.js + Express (con hot reload)    | 3000        |
| `postgres` | PostgreSQL 16 con volumen persistente | 5432        |

No hay más servicios que estos tres. Si en algún momento del hackathon alguien propone agregar Redis, Nginx, colas, etc., primero hay que evaluarlo en equipo — no agregarlo directo al `docker-compose.yml`.

## Variables de entorno

Definidas en `.env` (copiar desde `.env.example`):

```env
POSTGRES_DB=ionix_sentinel
POSTGRES_USER=sentinel_user
POSTGRES_PASSWORD=sentinel_password
POSTGRES_PORT=5432

BACKEND_PORT=3000
DATABASE_URL=postgresql://sentinel_user:sentinel_password@postgres:5432/ionix_sentinel

FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000
```

Notas:

- `DATABASE_URL` usa el hostname `postgres` porque así se llama el servicio dentro de la red interna de Docker Compose (no `localhost`).
- `VITE_API_URL` sí usa `localhost:3000` porque el navegador del usuario (fuera de Docker) es quien hace el fetch al backend.

## Comandos principales

```bash
# Preparar variables de entorno (solo la primera vez)
cp .env.example .env

# Levantar todo el ambiente (build + up)
docker compose up --build

# Levantar en segundo plano
docker compose up --build -d

# Ver logs de un servicio específico
docker compose logs -f backend

# Bajar el ambiente (mantiene el volumen de datos)
docker compose down

# Bajar el ambiente y borrar volúmenes (incluye datos de Postgres)
docker compose down -v
```

## Cómo borrar el volumen de PostgreSQL para reiniciar la DB

Si necesitas empezar con la base de datos limpia (por ejemplo, cambiaste el `init.sql` y quieres que se vuelva a ejecutar):

```bash
docker compose down -v
docker compose up --build
```

El flag `-v` elimina los volúmenes nombrados, incluyendo `ionix_postgres_data`. Esto es destructivo: se pierden todos los findings guardados. Úsalo solo cuando realmente quieras empezar de cero.

## Notas sobre desarrollo local

- El código de `frontend/src` y `backend/src` está montado como volumen, así que los cambios se reflejan sin reconstruir la imagen (hot reload).
- Si agregas una dependencia nueva (`npm install algo`), sí necesitas reconstruir la imagen: `docker compose up --build`.
- El backend espera a que Postgres esté `healthy` antes de arrancar (ver `depends_on.condition: service_healthy` en el `docker-compose.yml`).
