// Resuelve qué carpeta escanear en la rama "live-scan" a partir de una rama
// GIT REAL de matiasua/Ionix-sentinel (no una "rama" del selector de seeds
// de scan/seeds.ts, que son solo etiquetas). En vez de depender de un
// volumen de Docker montado a mano (SCAN_TARGET_HOST_PATH), el backend
// clona/actualiza la rama pedida por su cuenta en una carpeta scratch
// dentro del contenedor — no requiere que cada quien tenga el repo demo
// clonado localmente ni configurar ningún volumen.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

const REPO_URL = process.env.LIVE_SCAN_REPO_URL ?? "https://github.com/matiasua/Ionix-sentinel.git";
const SCRATCH_DIR = process.env.LIVE_SCAN_SCRATCH_DIR ?? "/tmp/live-scan-repos";

// Nombres de rama válidos en git: sin espacios, sin "..", no vacío. No es
// exhaustivo (git permite más) pero cubre todos los casos reales y bloquea
// cualquier intento de inyectar flags/paths raros hacia el CLI de git.
const VALID_BRANCH_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?$/;

export function isLikelyValidBranchName(branch: string): boolean {
  return VALID_BRANCH_NAME.test(branch) && !branch.includes("..");
}

// git ls-remote --heads no requiere clonar nada — solo consulta refs. Sirve
// tanto para poblar el dropdown del frontend como para validar que la rama
// pedida existe de verdad antes de intentar clonarla.
export async function listRemoteBranches(): Promise<string[]> {
  const { stdout } = await execFileAsync("git", ["ls-remote", "--heads", REPO_URL]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("refs/heads/")[1])
    .filter((name): name is string => Boolean(name));
}

function scratchPathFor(branch: string): string {
  // Los nombres de rama pueden traer "/" (ej. "feature/x") — no sirven como
  // nombre de carpeta tal cual.
  const safeName = branch.replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(SCRATCH_DIR, safeName);
}

// Clona (shallow, 1 commit) la rama pedida la primera vez; en corridas
// siguientes hace fetch+reset en vez de re-clonar desde cero. Devuelve la
// carpeta local lista para pasarle a analysis/runner.ts.
export async function resolveScanTarget(branch: string): Promise<string> {
  if (!isLikelyValidBranchName(branch)) {
    throw new Error(`Nombre de rama inválido: "${branch}"`);
  }

  const remoteBranches = await listRemoteBranches();
  if (!remoteBranches.includes(branch)) {
    throw new Error(`La rama "${branch}" no existe en ${REPO_URL}`);
  }

  const dir = scratchPathFor(branch);
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  if (fs.existsSync(path.join(dir, ".git"))) {
    await execFileAsync("git", ["fetch", "--depth", "1", "origin", branch], { cwd: dir });
    await execFileAsync("git", ["reset", "--hard", `origin/${branch}`], { cwd: dir });
  } else {
    fs.rmSync(dir, { recursive: true, force: true }); // por si quedó un clon a medias de una corrida anterior
    await execFileAsync("git", [
      "clone",
      "--depth", "1",
      "--branch", branch,
      "--single-branch",
      REPO_URL,
      dir,
    ]);
  }

  return dir;
}
