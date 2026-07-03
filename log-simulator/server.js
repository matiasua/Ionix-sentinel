// ─────────────────────────────────────────────────────────────────────────────
// log-simulator — sistema productivo simulado ("payments-runtime")
//
// Sistema independiente compuesto por 4 componentes. Expone una UI con 2 botones:
//   · Botón 1 → genera errores en las piezas 1 y 2 (api-gateway, payment-processor)
//   · Botón 2 → genera errores en las piezas 3 y 4 (ledger-db, notification-worker)
//
// Cada click escribe la PILA DE EJECUCIÓN COMPLETA del evento como JSON-lines en un
// .log en el volumen compartido: desde el inicio (api-gateway) hasta el componente
// donde se genera el error, con un correlationId que permite seguir el recorrido.
// El objetivo es que el .log sea auto-suficiente para que una IA (Claude/Gemini) o
// el Dashboard de Logs lo analicen, identifiquen el componente que falló y propongan
// una causa raíz + solución — por eso el log NO trae la respuesta, trae los síntomas
// (flujo, tipo de error, contexto, stack).
// ─────────────────────────────────────────────────────────────────────────────
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4100);
const LOG_DIR = process.env.SIM_LOG_DIR || "/var/log/sim";
const LOG_FILE = path.join(LOG_DIR, "payments-runtime.log");
const SYSTEM = "payments-runtime";

// Pipeline del sistema: el orden ES el flujo de ejecución (init → final).
const PIPELINE = [
  { componentId: "SVC-GATEWAY", component: "api-gateway", action: "http.receive", role: "Recepción y ruteo de requests" },
  { componentId: "SVC-PAYPROC", component: "payment-processor", action: "charge.authorize", role: "Autorización de cargos" },
  { componentId: "SVC-LEDGER", component: "ledger-db", action: "ledger.persist", role: "Persistencia y conciliación" },
  { componentId: "SVC-NOTIFY", component: "notification-worker", action: "notify.dispatch", role: "Notificaciones y webhooks" },
];

// Catálogo de errores por componente (síntomas + contexto; sin la solución).
const ERROR_CATALOG = {
  "SVC-GATEWAY": {
    errorType: "SchemaValidationError",
    message: "el payload de POST /charge no cumple el esquema: falta el campo 'amount'",
    context: { route: "POST /charge", missingField: "amount", contentType: "application/json" },
    stack: [
      "at validateSchema (api-gateway/middleware/validate.js:41)",
      "at RouteHandler.charge (api-gateway/routes/charge.js:12)",
      "at Server.<anonymous> (api-gateway/server.js:88)",
    ],
  },
  "SVC-PAYPROC": {
    errorType: "AuthorizationTimeout",
    message: "timeout esperando la autorización del gateway externo (stripe)",
    context: { gateway: "stripe", thresholdMs: 500, observedMs: 820, retries: 2 },
    stack: [
      "at PaymentProcessor.authorize (payment-processor/authorize.js:88)",
      "at async chargeFlow (payment-processor/flow.js:34)",
    ],
  },
  "SVC-LEDGER": {
    errorType: "ConnectionPoolExhausted",
    message: "no hay conexiones disponibles en el pool de Postgres para persistir la transacción",
    context: { poolSize: 10, active: 10, waiting: 7, waitedMs: 3000 },
    stack: [
      "at Pool.connect (ledger-db/pool.js:22)",
      "at LedgerRepository.persist (ledger-db/repository.js:57)",
    ],
  },
  "SVC-NOTIFY": {
    errorType: "WebhookDeliveryFailed",
    message: "el webhook al merchant devolvió 503 tras agotar los reintentos",
    context: { endpoint: "https://merchant.example/webhooks/payments", attempts: 5, lastStatus: 503 },
    stack: [
      "at WebhookClient.deliver (notification-worker/webhook.js:73)",
      "at NotificationWorker.dispatch (notification-worker/worker.js:29)",
    ],
  },
};

let seqCounter = 0;
function hex(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// Construye la traza completa de un evento que falla en el componente `failIdx`:
// todos los pasos previos se ejecutan OK, el paso `failIdx` genera el error, y los
// posteriores NO se ejecutan (la ejecución se corta ahí). Devuelve las líneas JSON.
function buildTrace(failIdx) {
  const correlationId = "trace_" + hex(10);
  const flow = PIPELINE.slice(0, failIdx + 1).map((p) => p.component);
  const baseTs = Date.now();
  const lines = [];

  for (let i = 0; i <= failIdx; i++) {
    const step = PIPELINE[i];
    const isError = i === failIdx;
    const line = {
      ts: new Date(baseTs + i * 40).toISOString(),
      level: isError ? "error" : "info",
      system: SYSTEM,
      correlationId,
      seq: i + 1,
      componentId: step.componentId,
      component: step.component,
      action: step.action,
      status: isError ? "error" : "ok",
      durationMs: isError ? undefined : 20 + Math.floor(Math.random() * 60),
      flow,
      message: isError
        ? ERROR_CATALOG[step.componentId].message
        : `${step.action} ok`,
    };
    if (isError) {
      const e = ERROR_CATALOG[step.componentId];
      line.errorType = e.errorType;
      line.context = e.context;
      line.stack = e.stack;
    }
    lines.push(line);
  }
  return { correlationId, failComponent: PIPELINE[failIdx], lines };
}

function appendTraces(traces) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const payload = traces.flatMap((t) => t.lines).map((l) => JSON.stringify(l)).join("\n") + "\n";
  fs.appendFileSync(LOG_FILE, payload, "utf8");
}

// Botón 1 → piezas 1 y 2 ; Botón 2 → piezas 3 y 4.
function emitGroup(group) {
  const indices = group === 1 ? [0, 1] : [2, 3];
  const traces = indices.map((i) => buildTrace(i));
  appendTraces(traces);
  return traces.map((t) => ({
    correlationId: t.correlationId,
    componentId: t.failComponent.componentId,
    component: t.failComponent.component,
    errorType: ERROR_CATALOG[t.failComponent.componentId].errorType,
    steps: t.lines.length,
  }));
}

function tail(n) {
  try {
    const content = fs.readFileSync(LOG_FILE, "utf8").trim();
    if (!content) return [];
    return content.split("\n").slice(-n);
  } catch {
    return [];
  }
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && url.pathname === "/") {
    return send(res, 200, HTML, "text/html; charset=utf-8");
  }
  if (req.method === "POST" && url.pathname === "/emit") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let group = 1;
      try { group = JSON.parse(raw || "{}").group === 2 ? 2 : 1; } catch { group = 1; }
      const emitted = emitGroup(group);
      send(res, 201, { ok: true, group, emitted, logFile: "payments-runtime.log" });
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/tail") {
    const n = Number(url.searchParams.get("n") || 30);
    return send(res, 200, { lines: tail(n) });
  }
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { status: "ok", service: "log-simulator", system: SYSTEM });
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`log-simulator (${SYSTEM}) escuchando en :${PORT} — escribiendo ${LOG_FILE}`);
});

const HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>payments-runtime · simulador de sistema productivo</title>
<style>
  :root{--bg:#0E0C0C;--panel:#1F1B1B;--line:rgba(255,255,255,.09);--txt:#F5F1ED;--dim:rgba(245,241,237,.55);--orange:#FF6B1A}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);font-family:Manrope,system-ui,sans-serif;padding:28px}
  h1{font-size:22px;margin:0 0 4px} .sub{color:var(--dim);font-size:14px;margin:0 0 20px}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .comp{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}
  .comp .cid{font-family:ui-monospace,monospace;font-size:11px;color:var(--orange);letter-spacing:.06em}
  .comp .cn{font-weight:700;font-size:14px;margin-top:4px} .comp .cr{color:var(--dim);font-size:12px;margin-top:4px}
  .btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px}
  button{background:var(--orange);color:#170B03;border:none;border-radius:999px;padding:14px 22px;font-weight:800;font-size:14.5px;cursor:pointer}
  button.two{background:#E8C77A}
  .feed{background:#0B0A0A;border:1px solid var(--line);border-radius:12px;padding:14px;height:44vh;overflow:auto}
  .feed div{font-family:ui-monospace,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
  .err{color:#FF7A76} .ok{color:#79BE96} .hint{color:var(--dim);font-size:12px;margin:10px 0 6px}
</style></head>
<body>
  <h1>payments-runtime <span class="mono" style="font-size:12px;color:var(--orange)">SISTEMA PRODUCTIVO SIMULADO</span></h1>
  <p class="sub">4 componentes. Cada botón genera errores con su traza completa (pila de ejecución + correlationId) escrita a <span class="mono">payments-runtime.log</span>, que el Dashboard de Logs analiza.</p>
  <div class="grid">
    <div class="comp"><div class="cid">SVC-GATEWAY · pieza 1</div><div class="cn">api-gateway</div><div class="cr">Recepción y ruteo</div></div>
    <div class="comp"><div class="cid">SVC-PAYPROC · pieza 2</div><div class="cn">payment-processor</div><div class="cr">Autorización de cargos</div></div>
    <div class="comp"><div class="cid">SVC-LEDGER · pieza 3</div><div class="cn">ledger-db</div><div class="cr">Persistencia / conciliación</div></div>
    <div class="comp"><div class="cid">SVC-NOTIFY · pieza 4</div><div class="cn">notification-worker</div><div class="cr">Notificaciones / webhooks</div></div>
  </div>
  <div class="btns">
    <button onclick="emit(1)">⚠ Generar errores · Piezas 1 y 2</button>
    <button class="two" onclick="emit(2)">⚠ Generar errores · Piezas 3 y 4</button>
  </div>
  <div class="hint">Últimas líneas del log (payments-runtime.log):</div>
  <div class="feed" id="feed"></div>
<script>
async function emit(group){
  const r = await fetch('/emit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({group})});
  const d = await r.json();
  await refresh();
}
function color(line){
  try{const o=JSON.parse(line); return o.level==='error'?'err':'ok';}catch{return '';}
}
async function refresh(){
  const r = await fetch('/tail?n=40'); const d = await r.json();
  const feed = document.getElementById('feed');
  feed.innerHTML = d.lines.map(l=>'<div class="'+color(l)+'">'+l.replace(/</g,'&lt;')+'</div>').join('');
  feed.scrollTop = feed.scrollHeight;
}
refresh(); setInterval(refresh, 3000);
</script>
</body></html>`;
