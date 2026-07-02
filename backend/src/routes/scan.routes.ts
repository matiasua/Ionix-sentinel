import { Router } from "express";
import { env } from "../config/env";
import { getLatestScanId, getScanSummary, runScan } from "../scan/service";

export const scanRouter = Router();

scanRouter.post("/api/scan", async (req, res) => {
  const bodyPath = typeof req.body?.path === "string" ? req.body.path.trim() : "";
  const targetPath = bodyPath !== "" ? bodyPath : env.scanTargetPath;

  if (!targetPath) {
    return res.status(400).json({
      error:
        "No se especificó qué repo escanear: pasa { path } en el body de POST /api/scan, o configura SCAN_TARGET_PATH en el .env del backend.",
    });
  }

  try {
    const result = await runScan(targetPath);
    res.status(201).json(result);
  } catch (error) {
    // A diferencia del resto de las rutas, acá sí devolvemos error.message:
    // durante la demo el error más probable es una ruta mal configurada
    // (SCAN_TARGET_PATH apuntando a una carpeta que no existe en esta
    // máquina), y ese mensaje ya viene descriptivo desde analysis/runner.ts.
    const message = error instanceof Error ? error.message : "Failed to run scan";
    res.status(500).json({ error: message });
  }
});

scanRouter.get("/api/scans/latest", async (_req, res) => {
  try {
    const scanId = await getLatestScanId();
    if (!scanId) {
      return res.json({ scanId: null, findingsCount: 0, riskScore: 0, severityCounts: {} });
    }
    const summary = await getScanSummary(scanId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch latest scan" });
  }
});

scanRouter.get("/api/scans/:id", async (req, res) => {
  try {
    const summary = await getScanSummary(req.params.id);
    if (!summary) {
      return res.status(404).json({ error: "Scan not found" });
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scan" });
  }
});
