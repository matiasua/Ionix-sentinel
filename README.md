# IONIX Sentinel

Solución para detección temprana de riesgos PCI-DSS en código y, eventualmente, logs. Este repositorio contiene la base técnica inicial: frontend (React + Vite), backend (Node.js + Express) y base de datos (PostgreSQL), orquestados con Docker Compose.

Ver la documentación completa en [`docs/`](./docs), empezando por [`docs/00-overview.docs.md`](./docs/00-overview.docs.md).

## Requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/) (incluido en Docker Desktop)

## Cómo levantar el proyecto

```bash
cp .env.example .env
docker compose up --build
```

Para bajar el ambiente:

```bash
# Detiene los contenedores, mantiene los datos de PostgreSQL
docker compose down

# Detiene los contenedores y borra los datos de PostgreSQL
docker compose down -v
```

## URLs del proyecto

| Servicio            | URL                              |
|----------------------|-----------------------------------|
| Frontend             | http://localhost:5173            |
| Backend              | http://localhost:3000            |
| Backend health check | http://localhost:3000/health     |
| Backend + DB check   | http://localhost:3000/api/health |
| Findings API         | http://localhost:3000/api/findings |
| PostgreSQL           | localhost:5432                   |

## Estructura del repositorio

```text
ionix-sentinel/
├── docker-compose.yml
├── .env.example
├── frontend/       # React + TypeScript + Vite
├── backend/        # Node.js + TypeScript + Express
└── docs/           # Documentación para el equipo
```

## Troubleshooting básico

**El backend no conecta a PostgreSQL (`/api/health` responde error 503)**
Espera unos segundos: el backend depende del healthcheck de Postgres, pero si Postgres tarda en iniciar por primera vez puede tomar unos segundos extra. Revisa los logs:

```bash
docker compose logs -f postgres
docker compose logs -f backend
```

**El frontend no puede llamar al backend**
Verifica que `VITE_API_URL` en `.env` apunte a `http://localhost:3000` (no a `backend:3000` — el navegador corre fuera de la red de Docker).

**Cambié una dependencia (`package.json`) y no se refleja**
Los `node_modules` viven en un volumen separado para performance. Reconstruye la imagen:

```bash
docker compose up --build
```

**Quiero reiniciar la base de datos desde cero**

```bash
docker compose down -v
docker compose up --build
```

Esto borra todos los findings guardados. Ver más detalle en [`docs/04-database.docs.md`](./docs/04-database.docs.md).

**Un puerto ya está en uso (5173, 3000 o 5432)**
Cambia el puerto correspondiente en `.env` (por ejemplo `FRONTEND_PORT=5174`) y vuelve a levantar el ambiente.
