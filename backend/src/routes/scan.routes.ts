import { Router } from "express";
import { getLatestScanId, getScanSummary, runScan } from "../scan/service";
import { isBranchKey } from "../scan/seeds";

export const scanRouter = Router();

// "Analizar repositorio": recibe la rama seleccionada en el dropdown y siembra
// los hallazgos de esa rama (DELETE + INSERT). Default "main" (0 hallazgos) si
// no viene branch, para no romper clientes viejos.
scanRouter.post("/api/scan", async (req, res) => {
  const branch = (req.body?.branch ?? "main") as unknown;
  if (!isBranchKey(branch)) {
    return res.status(400).json({ error: "Invalid branch" });
  }
  try {
    const result = await runScan(branch);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run scan" });
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
