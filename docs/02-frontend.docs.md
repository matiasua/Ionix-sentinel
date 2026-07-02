# 02 · Frontend

## Stack

- React 18
- TypeScript
- Vite (dev server con HMR)
- CSS plano (sin librerías de UI todavía)

## Estructura de carpetas

```text
frontend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx        # entrypoint de React
    ├── App.tsx         # pantalla principal (estado backend + form + lista)
    ├── api/
    │   └── client.ts   # funciones fetch hacia el backend (getHealth, getFindings, createFinding)
    └── styles/
        └── global.css  # estilos básicos
```

## Cómo correrlo

Con Docker (recomendado, ya viene levantado con `docker compose up --build`):

```bash
docker compose up --build frontend
```

Abre `http://localhost:5173`.

Localmente sin Docker (opcional, para depurar más rápido):

```bash
cd frontend
npm install
npm run dev
```

## Cómo consumir el backend

Todas las llamadas HTTP viven en `src/api/client.ts`. La URL base sale de la variable de entorno `VITE_API_URL` (por defecto `http://localhost:3000`).

Ejemplo de uso dentro de un componente:

```ts
import { getFindings, createFinding } from "./api/client";

const findings = await getFindings();
await createFinding({ title, description, severity, pciRequirement, source });
```

Si necesitas un nuevo endpoint, agrega la función correspondiente en `client.ts` en vez de hacer `fetch` directo desde los componentes — así mantenemos un solo lugar con la lógica de red.

## Tareas sugeridas para el compañero de frontend

- Mejorar la UX del formulario (validaciones en vivo, mensajes de error más claros).
- Agregar filtros a la lista de findings (por severidad, por fuente).
- Mostrar un estado vacío más elaborado o un loading skeleton.
- Preparar la estructura para una futura vista de "detalle de finding".
- Extraer componentes de `App.tsx` a medida que crece (ej. `FindingForm.tsx`, `FindingList.tsx`, `BackendStatus.tsx`) sin sobre-diseñar antes de que sea necesario.
