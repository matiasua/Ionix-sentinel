# Diseño del Dashboard — bundle de Claude Design

Este es el **handoff de diseño** generado con [Claude Design](https://claude.ai/design) a partir del brief en [`docs/06-frontend-spec.docs.md`](../../docs/06-frontend-spec.docs.md). Son **prototipos HTML/CSS/JS**, no código de producción — el objetivo es recrearlos en React dentro de `frontend/src/`, no copiar su estructura interna.

> Curado desde el `.zip` original descargado de Claude Design: se eliminaron duplicados, el runtime/build redundante y un diseño de otro proyecto de IONIX ("Gobierno de Datos") que venía mezclado en el mismo bundle.

## Contenido

| Archivo | Qué es |
|---|---|
| `ionix-sentinel.dc.html` | **Fuente principal del diseño.** Léelo primero, de principio a fin. Referencia `support.js`. |
| `support.js` | Runtime generado (`dc-runtime`) que renderiza el `.dc.html` en el navegador. Solo sirve para previsualizar el prototipo — no se porta a producción. |
| `ionix-sentinel.standalone.html` | Versión autocontenida (todo inline, sin dependencias externas). Ábrelo directo en el navegador para ver el diseño sin nada más. |
| `mock-findings.js` | Datos de ejemplo en formato **ESM**, ya con el esquema exacto de `Finding` (ver `frontend/src/api/client.ts` y `docs/07-backend-spec.docs.md` §3). Este archivo es la referencia de contrato de datos entre frontend y backend. |
| `brand/ionix-logo.png` | Logo usado en el sidebar del diseño. |

## Cómo previsualizarlo

```bash
open "frontend/design/ionix-sentinel.standalone.html"
```

O sirve la carpeta con cualquier servidor estático para ver `ionix-sentinel.dc.html` (necesita `support.js` en el mismo directorio).

## Vistas que incluye el diseño

El prototipo terminó con más alcance que el brief original de 3 vistas — agregó navegación completa:

- **Dashboard estático** — hallazgos de código (lo especificado en `06-frontend-spec.docs.md`: risk score, tiles por severidad, lista de findings).
- **Dashboard logs** — vista para el Analizador de Logs (Fase 2 del roadmap, según el pitch).
- **Configuración → Reglas** — gestión del motor de reglas dinámico (YAML/JSON).
- **Configuración → Repositorios** — selección de repos a analizar.

## Estado: pendiente de portar a React

Esto **todavía no es** el frontend funcional. Próximos pasos:

1. Leer `ionix-sentinel.dc.html` completo y sus estilos/estructura.
2. Recrear cada vista como componentes en `frontend/src/` (React + TS), siguiendo el inventario de componentes de `06-frontend-spec.docs.md` §3.
3. Portar `mock-findings.js` a `frontend/src/mocks/findings.ts` (mismo esquema, tipado).
4. Reemplazar los mocks por llamadas reales a la API una vez que el backend exponga los endpoints de `07-backend-spec.docs.md` §5.

## Para quien construya el backend

Este diseño (especialmente `mock-findings.js`) es la referencia más concreta del **contrato de datos** que el frontend espera: campos, tipos, y ejemplos reales de `explanation`/`remediation` generados por Claude. Úsalo junto con `docs/07-backend-spec.docs.md` para no desalinear nombres de campos.
