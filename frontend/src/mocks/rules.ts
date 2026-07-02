// Portado de frontend/design/ionix-sentinel.dc.html — reglas de detección.
// Las reglas reales viven en backend/src/rules/pci-rules.yaml (docs/07-backend-spec.docs.md §4);
// esto es solo la vista de Configuración → Reglas mientras no hay endpoint que las exponga.
import type { Severity, Source } from "../api/client";

export interface RuleDef {
  id: string;
  title: string;
  pci: string;
  severity: Severity;
  source: Source;
  category: string;
  enabledByDefault: boolean;
}

export const rules: RuleDef[] = [
  { id: "SENTINEL-PAN-001", title: "PAN en texto plano (base de datos)", pci: "3.4", severity: "critical", source: "code", category: "Datos de tarjeta", enabledByDefault: true },
  { id: "SENTINEL-KEY-003", title: "Clave de cifrado hardcodeada", pci: "3.5.1", severity: "critical", source: "code", category: "Gestión de claves", enabledByDefault: true },
  { id: "SENTINEL-LOG-002", title: "PAN registrado en logs", pci: "3.4", severity: "high", source: "log", category: "Datos de tarjeta", enabledByDefault: true },
  { id: "SENTINEL-INJ-001", title: "Inyección SQL por concatenación", pci: "6.5.1", severity: "high", source: "code", category: "Desarrollo seguro", enabledByDefault: true },
  { id: "SENTINEL-TLS-004", title: "Protocolos TLS legados habilitados", pci: "4.2.1", severity: "high", source: "code", category: "Transmisión", enabledByDefault: true },
  { id: "SENTINEL-PWD-002", title: "Política de contraseñas débil", pci: "8.2.3", severity: "medium", source: "code", category: "Autenticación", enabledByDefault: true },
  { id: "SENTINEL-SES-001", title: "Cookie de sesión sin Secure/HttpOnly", pci: "6.5.10", severity: "medium", source: "code", category: "Sesiones", enabledByDefault: true },
  { id: "SENTINEL-DEP-005", title: "Dependencia con CVE crítico conocido", pci: "6.3.3", severity: "medium", source: "code", category: "Dependencias", enabledByDefault: true },
  { id: "SENTINEL-SES-003", title: "Timeout de sesión excesivo", pci: "8.2.8", severity: "medium", source: "code", category: "Sesiones", enabledByDefault: true },
  { id: "SENTINEL-HDR-001", title: "Versión de servidor expuesta en headers", pci: "2.2.5", severity: "low", source: "log", category: "Hardening", enabledByDefault: true },
  { id: "SENTINEL-LOG-006", title: "Logs de auditoría sin sincronización NTP", pci: "10.6.1", severity: "low", source: "code", category: "Auditoría", enabledByDefault: false },
  { id: "SENTINEL-DBG-002", title: "Stack traces devueltos al cliente", pci: "6.5.5", severity: "low", source: "code", category: "Desarrollo seguro", enabledByDefault: true },
];
