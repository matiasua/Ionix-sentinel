import { Router } from "express";
import { getLatestScanId, getScanSummary, runScan } from "../scan/service";
import { isBranchKey } from "../scan/seeds";
import { listRemoteBranches } from "../scan/gitRepo";

export const scanRouter = Router();

// "Analizar repositorio": recibe la rama seleccionada en el dropdown y siembra
// los hallazgos de esa rama (DELETE + INSERT). Default "main" (0 hallazgos) si
// no viene branch, para no romper clientes viejos.
//
// `gitBranch` es opcional y solo aplica cuando branch === "live-scan": es el
// nombre de una rama GIT REAL de matiasua/Ionix-sentinel (no una de las
// ramas-etiqueta del selector de seeds) que se clona/actualiza sola — ver
// scan/gitRepo.ts. Si no se manda, cae al comportamiento de siempre
// (SCAN_TARGET_PATH legado, o la rama pci-vulnerable-demo por default).
scanRouter.post("/api/scan", async (req, res) => {
  const branch = (req.body?.branch ?? "main") as unknown;
  if (!isBranchKey(branch)) {
    return res.status(400).json({ error: "Invalid branch" });
  }
  const gitBranch = typeof req.body?.gitBranch === "string" ? req.body.gitBranch : undefined;

  try {
    const result = await runScan(branch, gitBranch);
    res.status(201).json(result);
  } catch (error) {
    // A diferencia del resto de las rutas, acá sí devolvemos error.message:
    // el error más probable en "live-scan" es una rama git que no existe, o
    // un problema de red al clonarla, y ese mensaje ya viene descriptivo
    // desde scan/gitRepo.ts.
    const message = error instanceof Error ? error.message : "Failed to run scan";
    res.status(500).json({ error: message });
  }
});

// Lista las ramas reales de matiasua/Ionix-sentinel para poblar el selector
// de "live-scan" en el frontend (dropdown dinámico, no una lista fija).
scanRouter.get("/api/live-scan/branches", async (_req, res) => {
  try {
    const branches = await listRemoteBranches();
    res.json({ branches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list branches";
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
