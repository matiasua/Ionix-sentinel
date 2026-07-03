import { Router } from "express";
import { getLatestScanId } from "../scan/service";
import { generateBranchLog } from "../scan/logfile";
import { isBranchKey } from "../scan/seeds";

export const logsRouter = Router();

// Dashboard de logs: devuelve el contenido de generated-logs/<branch>.log más
// los hallazgos y sistemas derivados de esa rama. Todo sale del mismo builder
// que el archivo, así que el Dashboard de logs queda consistente con el estático.
logsRouter.get("/api/logs", async (req, res) => {
  const branch = (req.query.branch ?? "main") as unknown;
  if (!isBranchKey(branch)) {
    return res.status(400).json({ error: "Invalid branch" });
  }
  try {
    const scanId = (await getLatestScanId()) ?? `scan_${branch}`;
    res.json(generateBranchLog(branch, scanId));
  } catch (error) {
    res.status(500).json({ error: "Failed to build logs" });
  }
});
