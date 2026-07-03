import { Router } from "express";
import { pool } from "../db/pool";
import { CreateFindingInput, Finding, Severity, Source, Status } from "../types/finding";
import { SEVERITY_ORDER_SQL } from "../lib/severity";
import { generateCodeSolution } from "../reasoning/client";

export const findingsRouter = Router();

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const VALID_SOURCES: Source[] = ["code", "log"];
const VALID_STATUSES: Status[] = ["open", "acknowledged", "resolved", "false_positive"];

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
    category: row.category ?? null,
    branch: row.branch ?? null,
    codeSolution:
      row.code_solution_before != null
        ? {
            codeBefore: row.code_solution_before,
            codeAfter: row.code_solution_after,
            explanation: row.code_solution_explanation,
            generatedAt: row.code_solution_generated_at,
          }
        : null,
    codeSolutionStatus: row.code_solution_status ?? null,
    createdAt: row.created_at,
  };
}

findingsRouter.get("/api/findings", async (req, res) => {
  const { severity, source, status, scanId } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (typeof severity === "string") {
    if (!VALID_SEVERITIES.includes(severity as Severity)) {
      return res.status(400).json({ error: "Invalid severity filter" });
    }
    params.push(severity);
    conditions.push(`severity = $${params.length}`);
  }

  if (typeof source === "string") {
    if (!VALID_SOURCES.includes(source as Source)) {
      return res.status(400).json({ error: "Invalid source filter" });
    }
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  if (typeof status === "string") {
    if (!VALID_STATUSES.includes(status as Status)) {
      return res.status(400).json({ error: "Invalid status filter" });
    }
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (typeof scanId === "string") {
    params.push(scanId);
    conditions.push(`scan_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT * FROM findings ${where} ORDER BY ${SEVERITY_ORDER_SQL}, created_at DESC`,
      params
    );
    res.json(result.rows.map(mapRowToFinding));
  } catch (error) {
    console.error("[findings] GET /api/findings falló:", error);
    res.status(500).json({ error: "Failed to fetch findings" });
  }
});

findingsRouter.get("/api/findings/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM findings WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Finding not found" });
    }
    res.json(mapRowToFinding(result.rows[0]));
  } catch (error) {
    console.error("[findings] GET /api/findings/:id falló:", error);
    res.status(500).json({ error: "Failed to fetch finding" });
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
    console.error("[findings] POST /api/findings falló:", error);
    res.status(500).json({ error: "Failed to create finding" });
  }
});

findingsRouter.patch("/api/findings/:id", async (req, res) => {
  const { status } = req.body as { status?: Status };

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid or missing status" });
  }

  try {
    const result = await pool.query(
      "UPDATE findings SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Finding not found" });
    }
    res.json(mapRowToFinding(result.rows[0]));
  } catch (error) {
    console.error("[findings] PATCH /api/findings/:id falló:", error);
    res.status(500).json({ error: "Failed to update finding" });
  }
});

// "Generar solución" (botón en el detalle de un hallazgo, ver
// frontend/src/views/FindingDetail.tsx): a diferencia de explanation/
// remediation (generados en bulk durante el scan), esto corre on-demand,
// una vez por click, y persiste el resultado para no volver a gastar
// tokens si el usuario vuelve a este hallazgo. Solo aplica a findings de
// código (los de logs no tienen fila en esta tabla — ver App.tsx del
// frontend, "no persisten en DB").
findingsRouter.post("/api/findings/:id/solve", async (req, res) => {
  try {
    const current = await pool.query("SELECT * FROM findings WHERE id = $1", [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Finding not found" });
    }

    const finding = mapRowToFinding(current.rows[0]);
    const solution = await generateCodeSolution(finding);

    const updated = await pool.query(
      `UPDATE findings
         SET code_solution_before = $1,
             code_solution_after = $2,
             code_solution_explanation = $3,
             code_solution_status = $4,
             code_solution_generated_at = now()
       WHERE id = $5
       RETURNING *`,
      [solution.codeBefore, solution.codeAfter, solution.explanation, solution.codeSolutionStatus, req.params.id]
    );

    res.json(mapRowToFinding(updated.rows[0]));
  } catch (error) {
    console.error("[findings] POST /api/findings/:id/solve falló:", error);
    res.status(500).json({ error: "Failed to generate code solution" });
  }
});
