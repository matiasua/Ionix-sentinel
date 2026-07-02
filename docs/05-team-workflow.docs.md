# 05 · Team Workflow — 4 personas en paralelo

## Distribución sugerida

**Persona 1 — Frontend / Dashboard**
Dueño de `frontend/`. Mejora la UI, la experiencia de crear y listar findings, y prepara el terreno visual para futuras vistas (detalle de finding, dashboard de riesgo).

**Persona 2 — Backend / API**
Dueño de `backend/src/routes` y `backend/src/index.ts`. Agrega endpoints, validaciones, y mantiene el contrato de la API estable para que frontend no se rompa.

**Persona 3 — Base de datos / Modelo de findings**
Dueño de `backend/src/db` y del modelo de datos (`backend/src/types/finding.ts`). Evoluciona el esquema de `findings`, piensa en qué campos futuros se van a necesitar (ej. `status`, `file_path`, `line_number`) y coordina migraciones manuales.

**Persona 4 — Motor futuro de análisis PCI-DSS**
Trabaja en paralelo, probablemente en una carpeta nueva (ej. `analysis/` o `backend/src/analysis/`) sin tocar el core de la API todavía. Explora cómo detectar patrones de riesgo PCI-DSS en código (reglas, regex, o integraciones con herramientas de análisis estático), y define cómo esos resultados se van a insertar como `findings` vía el endpoint `POST /api/findings` que ya existe.

## Buenas prácticas para no pisarse

- **Trabajar por ramas.** Cada persona trabaja en su propia rama (`feature/frontend-filters`, `feature/api-pagination`, etc.) y hace merge a la rama principal vía PR, aunque sea rápido.
- **Commits pequeños y frecuentes.** Mejor 5 commits chicos y claros que 1 commit gigante al final del día. Facilita resolver conflictos y entender qué cambió.
- **No romper el `docker-compose.yml`.** Si necesitas agregar una variable de entorno o cambiar un puerto, avisa al equipo antes de hacer merge — este archivo es compartido y lo usan los 4.
- **Probar `docker compose up --build` antes de hacer merge.** Si tu rama no levanta limpio desde cero, no la mergees. Esto evita que alguien más pierda tiempo debuggeando un ambiente roto que no rompió él.
- **Mantener el README actualizado.** Si agregas un comando nuevo, una variable de entorno, o cambias cómo se levanta algo, actualiza el `README.md` en el mismo PR.
- **Contrato de API como frontera.** Frontend y Backend deben respetar el modelo de `Finding` (`backend/src/types/finding.ts` / `frontend/src/api/client.ts`). Si cambia el modelo, avísale a la otra persona antes de mergear.
- **Findings de prueba, no basura.** Al probar el formulario, usa datos que tengan sentido (ej. requisitos PCI-DSS reales como `3.4`, `6.5.1`, `8.2.3`) para que la demo se vea creíble.

## Ritmo sugerido durante el hackathon

1. Al arrancar: cada uno corre `docker compose up --build` una vez para confirmar que la base funciona antes de empezar a modificar algo.
2. Sincronizaciones cortas cada 1-2 horas para avisar cambios de contrato (API, esquema de DB, variables de entorno).
3. Antes de la demo: probar el flujo completo end-to-end (crear finding desde el frontend → verlo en la lista → verificar que persiste tras reiniciar contenedores) al menos una vez todos juntos.
