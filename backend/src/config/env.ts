export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://sentinel_user:sentinel_password@localhost:5432/ionix_sentinel",

  // Carpeta a escanear por defecto en POST /api/scan cuando el body no manda
  // { path } (el frontend de hoy no lo manda: dispara el scan sin body, ver
  // frontend/src/api/client.ts::triggerScan). Debe apuntar al checkout local
  // de pci-dss-vulnerable-demo en la rama pci-vulnerable-demo — cada quien la
  // trae como carpeta separada sin cambiar de rama de este repo (ver HU-B1.1
  // en docs/epicas-historias.md: worktree, ZIP de la rama, o submódulo).
  //
  // Corriendo con docker-compose: SCAN_TARGET_PATH ya viene fijo en
  // /app/scan-target (ver docker-compose.yml) — la ruta real de tu máquina se
  // configura aparte con SCAN_TARGET_HOST_PATH en tu .env, que es lo que se
  // monta como volumen de solo lectura dentro del contenedor.
  //
  // Si queda sin configurar y tampoco llega { path } en el body, scan.routes.ts
  // responde 400 en vez de adivinar una ruta que puede no existir.
  scanTargetPath: process.env.SCAN_TARGET_PATH ?? null,
};
