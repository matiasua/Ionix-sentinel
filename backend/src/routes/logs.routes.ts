import { Router } from "express";
import { buildLiveLogPayload } from "../logs/analyzer";
import { generateCodeSolution } from "../reasoning/client";
import type { Severity } from "../types/finding";

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

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

// "Generar solución" en el detalle de un hallazgo de logs — misma idea que
// POST /api/findings/:id/solve, pero los findings de logs NO tienen fila en
// `findings` (se generan al vuelo en buildLiveLogPayload, ver App.tsx del
// frontend: "no persisten en DB"). Por eso este endpoint no busca por id:
// recibe los datos del finding en el body y devuelve la solución sin
// guardar nada — el frontend la mergea en su estado local (logData), igual
// que ya hace con el cambio de status para findings de logs.
logsRouter.post("/api/logs/solve", async (req, res) => {
  const { ruleId, pciRequirement, title, severity, filePath, lineNumber, snippet, explanation } =
    req.body ?? {};

  if (
    !ruleId ||
    !pciRequirement ||
    !title ||
    !severity ||
    !filePath ||
    !snippet ||
    !explanation ||
    typeof severity !== "string" ||
    !VALID_SEVERITIES.includes(severity as Severity)
  ) {
    return res.status(400).json({
      error:
        "Missing or invalid fields: ruleId, pciRequirement, title, severity, filePath, snippet, explanation",
    });
  }

  try {
    const solution = await generateCodeSolution({
      ruleId,
      pciRequirement,
      title,
      severity: severity as Severity,
      filePath,
      lineNumber: typeof lineNumber === "number" ? lineNumber : null,
      snippet,
      explanation,
    });

    res.json({
      codeSolution: {
        codeBefore: solution.codeBefore,
        codeAfter: solution.codeAfter,
        explanation: solution.explanation,
        generatedAt: new Date().toISOString(),
      },
      codeSolutionStatus: solution.codeSolutionStatus,
    });
  } catch (error) {
    console.error("[logs] POST /api/logs/solve falló:", error);
    res.status(500).json({ error: "Failed to generate code solution" });
  }
});
