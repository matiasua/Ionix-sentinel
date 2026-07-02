# IONIX Sentinel — contexto del proyecto

## Qué es esto
IONIX Sentinel detecta violaciones en base a reglas dinámicas creadas, como por ejemplo PCI-DSS en código, secretos, fallas de seguridad y análisis de logs en producción, antes de que se conviertan en un incidente o una multa real, detectando fallas y notificando soluciones. Los logs que analiza provienen de distintos componentes que interactúan entre sí, y el sistema debe poder reconstruir la trazabilidad para hacer seguimiento de fallas y hallazgos.

Proyecto de hackathon de IA en IONIX SpA (fintech de pagos y conciliación bancaria), a construir en 2 días (jueves-viernes) por un equipo de 4: 1 experto en IA, 1 developer, 1 ing. de infraestructura, 1 PM.

## Por qué existe (no perder de vista el negocio)
IONIX procesa pagos y hace conciliación bancaria — el incumplimiento de PCI-DSS cuesta entre $5,000 y $100,000 USD/mes en multas (hasta $1,000,000 si no se corrige en 12 meses), además del riesgo de perder la licencia para procesar pagos.

Herramientas como Sonar, Veracode, Kiuwan o Fortify ya existen, pero son generalistas: PCI-DSS es solo uno de 6-10 estándares que cubren, solo miran código (nunca logs), su motor de reglas es cerrado, y cuestan entre $10,000 y más de $500,000 USD/año. Nuestra apuesta es lo contrario: 100% especializado en PCI-DSS y pagos, código y logs correlacionados, motor de reglas propio y dinámico, construido en días, no meses.

## Alcance del hackathon — leer antes de proponer trabajo fuera de esto
- **Comprometido (Fase 1):** Analizador Estático completo, funcionando de punta a punta, con demo en vivo.
- **Stretch goal (Fase 2), solo si sobra tiempo:** Analizador de Logs. Reutiliza el motor de reglas del Analizador Estático — no se construye desde cero.
- Si hay que elegir entre pulir Fase 1 o avanzar Fase 2, **siempre gana pulir Fase 1**.

## Arquitectura en tres frases
Los hallazgos crudos —vengan de código o, eventualmente, de logs— comparten siempre el mismo esquema JSON sin importar su origen. El motor de reglas es determinístico y decide *qué* es una violación PCI-DSS; Claude solo interpreta ese hallazgo para asignar severidad, explicación y remediación, nunca decide por su cuenta si algo es una vulnerabilidad. Todo hallazgo enriquecido se guarda en Postgres y alimenta un dashboard con risk score agregado.

Para el detalle componente por componente (responsabilidades, contratos JSON exactos, stack sugerido por pieza), ver @docs/especificacion-tecnica.md — mantenlo en el repo para que se cargue como referencia. *(Pendiente de crear — si no existe todavía, no asumir su contenido.)*

## Componentes (resumen — detalle completo en el doc de arriba)
1. **Analizador Estático** — escanea código/PRs, aplica reglas (semgrep + reglas propias PCI-DSS), emite findings crudos.
2. **Analizador de Logs** (Fase 2) — mismo motor de reglas aplicado a logs, correlaciona con el finding de código que originó la fuga.
3. **Motor de Razonamiento** — Claude API; toma un finding crudo + snippet de contexto y devuelve JSON con requisito PCI-DSS, severidad, explicación y remediación.
4. **Dashboard de Compliance** — backend Node.js + frontend React; lista de hallazgos, risk score, filtros, detalle por hallazgo.

## Stack del proyecto
- **Frontend:** React + TypeScript (dashboard de compliance: lista de hallazgos, risk score, filtros, detalle por hallazgo).
- **Backend:** Node.js (API que expone los hallazgos, orquesta el análisis y llama a la Claude API para el motor de razonamiento).
- **Base de datos:** PostgreSQL (persistencia de findings enriquecidos, esquema único sin importar el origen del hallazgo).
- **Analizador estático:** semgrep + reglas propias PCI-DSS, invocado desde el backend (proceso separado o subproceso), independiente del lenguaje del código analizado.
- **Motor de razonamiento:** Claude API (Sonnet), con salida en JSON estructurado y validación defensiva del parseo antes de persistir en Postgres.

## Convenciones
- Nombres de reglas PCI-DSS y mensajes visibles al usuario: en español. Variables y funciones en el código: en inglés.
- Un único esquema de "finding crudo" para código y logs — no crear tipos de datos distintos según la fuente.
- Cobertura antes que amplitud: 10-12 reglas PCI-DSS bien hechas en un solo lenguaje valen más que muchas reglas a medias en varios lenguajes.

## Reglas duras (no negociables)
- El motor de reglas determinístico es la única fuente de verdad sobre si algo es una violación. Claude nunca "encuentra" hallazgos por su cuenta — solo enriquece los que ya llegaron.
- Toda salida de Claude se parsea y valida contra un schema antes de guardarse en Postgres. Nunca asumir que el string completo es JSON válido.
- No implementar detección de anomalías con ML real — usar reglas de umbral simples, y decirlo tal cual es si se muestra en la demo.
- No gastar tiempo en autenticación, soporte multi-usuario, ni pulido visual del dashboard. Que funcione en vivo pesa más que verse perfecto.

## Gotchas conocidos
- Un regex de número de tarjeta sin validación de Luhn genera falsos positivos masivos — siempre validar Luhn antes de marcar un hallazgo de PAN.
- La correlación código↔log se resuelve con un grep del string literal del log sobre el repo — no hace falta nada más sofisticado para el MVP.
- Claude a veces agrega texto antes o después del JSON pedido — parsear de forma defensiva, buscando el bloque JSON en vez de asumir que el string completo lo es.

## Criterios de evaluación del hackathon (para priorizar esfuerzo)
Impacto en IONIX (25 pts) · Uso efectivo de Claude Code (30 pts) · Funcionalidad demo (20 pts) · Calidad técnica (15 pts) · Presentación (10 pts).

El criterio que más pesa es cómo se usó Claude Code durante la construcción. Vale la pena ir anotando ejemplos concretos de esto mientras se trabaja (qué tarea resolvió, cuánto tiempo ahorró), no reconstruirlos de memoria el último día.
