import { Router } from "express";
import { pool } from "../db/pool";
import { CreateFindingInput, Finding, Severity, Source } from "../types/finding";

export const findingsRouter = Router();

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const VALID_SOURCES: Source[] = ["code", "log"];

function mapRowToFinding(row: any): Finding {
  return {
    id: row.id,
    ruleId: row.rule_id,
    pciRequirement: row.pci_requirement,
    title: row.title,
    severity: row.severity,
    source: row.source,
    filePath: row.file_path,
    lineNumber: row.line_number,
    snippet: row.snippet,
    explanation: row.explanation,
    remediation: row.remediation,
    status: row.status,
    scanId: row.scan_id,
    reasoningStatus: row.reasoning_status,
    createdAt: row.created_at,
  };
}

findingsRouter.get("/api/findings", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM findings ORDER BY created_at DESC"
    );
    res.json(result.rows.map(mapRowToFinding));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch findings" });
  }
});

findingsRouter.post("/api/findings", async (req, res) => {
  const { ruleId, pciRequirement, title, severity, source, filePath, lineNumber, snippet } =
    req.body as Partial<CreateFindingInput>;

  if (!ruleId || !pciRequirement || !title || !severity || !source || !filePath || !snippet) {
    return res.status(400).json({
      error:
        "Missing required fields: ruleId, pciRequirement, title, severity, source, filePath, snippet",
    });
  }

  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ error: "Invalid severity" });
  }

  if (!VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO findings (rule_id, pci_requirement, title, severity, source, file_path, line_number, snippet)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ruleId, pciRequirement, title, severity, source, filePath, lineNumber ?? null, snippet]
    );
    res.status(201).json(mapRowToFinding(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: "Failed to create finding" });
  }
});
