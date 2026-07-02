import { Router } from "express";
import { getLatestScanId, getScanSummary, runScan } from "../scan/service";

export const scanRouter = Router();

scanRouter.post("/api/scan", async (_req, res) => {
  try {
    const result = await runScan();
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
