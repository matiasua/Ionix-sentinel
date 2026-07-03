// T1.1 (HU-B1.1) — Analizador Estático: recorre un path de código y devuelve
// coincidencias crudas de las reglas cargadas por rules/loader.ts.
//
// Nota de alcance (ver también el encabezado de pci-rules.yaml): hoy TODAS
// las reglas usan detector "regex", no semgrep. Por eso este runner escanea
// el contenido de los archivos directamente con las regex del YAML, en vez
// de invocar el binario de semgrep como subproceso. Es una decisión
// deliberada por tiempo — el punto de extensión para sumar semgrep real
// (reglas con detector: "semgrep") queda marcado más abajo, sin que el resto
// del pipeline (mapper.ts, scan.routes.ts) tenga que cambiar: la firma
// pública (runAnalysis(path, rules) => RawMatch[]) no cambia.
import fs from "fs";
import path from "path";
import type { Rule } from "../types/rule";
import { isValidLuhn } from "./luhn";

export interface RawMatch {
  ruleId: string;
  /** Ruta relativa al `targetPath` recibido, ej. "lib/db.ts". */
  filePath: string;
  lineNumber: number;
  matchText: string;
  /** 1-2 líneas de contexto alrededor del match, para el snippet del finding. */
  snippet: string;
}

const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build"]);

export function runAnalysis(targetPath: string, rules: Rule[]): RawMatch[] {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`La ruta a analizar no existe: ${targetPath}`);
  }

  const files = collectFiles(targetPath);
  const matches: RawMatch[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const rule of rules) {
      matches.push(...matchRule(rule, file, targetPath, content));
    }
  }

  return matches;
}

function collectFiles(root: string): string[] {
  const result: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const stat = fs.statSync(current);

    if (stat.isDirectory()) {
      if (IGNORED_DIRS.has(path.basename(current))) continue;
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
    } else if (SCANNABLE_EXTENSIONS.has(path.extname(current))) {
      result.push(current);
    }
  }

  return result;
}

function matchRule(rule: Rule, file: string, targetPath: string, content: string): RawMatch[] {
  if (rule.detector !== "regex") {
    // Punto de extensión para semgrep real — no implementado hoy (ver nota arriba).
    return [];
  }

  const flags = rule.flags.includes("g") ? rule.flags : `${rule.flags}g`;
  let regex: RegExp;
  try {
    regex = new RegExp(rule.pattern, flags);
  } catch {
    // loader.ts ya valida esto al cargar; defensivo por si el archivo cambió en runtime.
    return [];
  }

  const lines = content.split("\n");
  const results: RawMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Evita loop infinito si el pattern puede matchear un string vacío.
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }

    if (rule.luhn && !isValidLuhn(match[0])) {
      continue; // HU-B1.3: descarta "posibles PAN" que no pasan Luhn.
    }

    const lineNumber = content.slice(0, match.index).split("\n").length;
    const startLine = Math.max(0, lineNumber - 2);
    const endLine = Math.min(lines.length, lineNumber + 1);

    results.push({
      ruleId: rule.id,
      filePath: path.relative(targetPath, file),
      lineNumber,
      matchText: match[0],
      snippet: lines.slice(startLine, endLine).join("\n"),
    });
  }

  return results;
}
