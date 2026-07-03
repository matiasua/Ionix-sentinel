import { Router } from "express";
import { buildLiveLogPayload } from "../logs/analyzer";

export const logsRouter = Router();

// Dashboard de Logs: analiza los .log del sistema productivo simulado
// (log-simulator) y devuelve componentes, hallazgos (con causa raíz + solución)
// y las trazas de ejecución. Es la contraparte de ejecución del Dashboard
// Estático (que escanea código en la tabla `findings`).
logsRouter.get("/api/logs", (_req, res) => {
  try {
    res.json(buildLiveLogPayload());
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze logs" });
  }
});
