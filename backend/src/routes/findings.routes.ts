import { Router } from "express";
import { pool } from "../db/pool";
import { CreateFindingInput, Finding, Severity, Source } from "../types/finding";

export const findingsRouter = Router();

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const VALID_SOURCES: Source[] = ["code", "log"];

function mapRowToFinding(row: any): Finding {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    pciRequirement: row.pci_requirement,
    source: row.source,
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
  const { title, description, severity, pciRequirement, source } =
    req.body as Partial<CreateFindingInput>;

  if (!title || !description || !severity || !pciRequirement || !source) {
    return res.status(400).json({
      error:
        "Missing required fields: title, description, severity, pciRequirement, source",
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
      `INSERT INTO findings (title, description, severity, pci_requirement, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, severity, pciRequirement, source]
    );
    res.status(201).json(mapRowToFinding(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: "Failed to create finding" });
  }
});
