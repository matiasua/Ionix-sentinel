# 00 · Overview — IONIX Sentinel

## ¿Qué es IONIX Sentinel?

IONIX Sentinel es una solución orientada a la **detección temprana de riesgos PCI-DSS** en código fuente y, eventualmente, en logs de aplicación. La idea es identificar hallazgos de seguridad (findings) relacionados con el estándar PCI-DSS antes de que lleguen a producción.

Un "finding" es un hallazgo puntual: por ejemplo, una credencial hardcodeada, una comunicación sin cifrar, o una validación de entrada faltante que viola un requisito específico de PCI-DSS.

## Objetivo del hackathon

Construir en tiempo acotado una **base técnica funcional** que:

- Permita a 4 personas trabajar en paralelo sin pisarse.
- Tenga un flujo end-to-end demostrable: crear un finding desde el frontend, guardarlo en PostgreSQL, y listarlo de vuelta.
- Sirva de punto de partida para agregar, más adelante, el motor real de análisis PCI-DSS (estático sobre código, y luego sobre logs).

## Alcance técnico de esta base

Incluido en este scaffold inicial:

- Frontend en React + TypeScript + Vite, con una pantalla simple para ver y crear findings.
- Backend en Node.js + TypeScript + Express, con endpoints REST básicos.
- PostgreSQL con una tabla `findings` y persistencia vía volumen Docker.
- Todo orquestado con `docker compose up --build`.

## Qué queda fuera por ahora

Para mantener la base simple y evitar fricción durante el hackathon, **no se incluyen todavía**:

- Redis, colas o workers.
- MinIO u otro almacenamiento de objetos.
- Nginx u otro reverse proxy.
- Kafka o cualquier bus de eventos.
- Observabilidad (métricas, tracing, logging centralizado).
- Autenticación y autorización avanzada.
- El motor de análisis PCI-DSS en sí (parsers de código, reglas, integración con logs). Esto se construye **sobre** esta base.

Cualquiera de estos componentes se puede agregar después, una vez que la base esté validada y el equipo tenga más claridad sobre lo que realmente necesita.
