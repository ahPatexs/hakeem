/** Path segments under `/[locale]/…` that use the auth shell (no marketing nav/footer). */
export const AUTH_SHELL_SEGMENTS = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "unauthorized",
  "access-denied",
  "session-expired",
]);

/** Role portal segments that use dedicated portal shell (no marketing nav/footer). */
export const PORTAL_SHELL_SEGMENTS = new Set(["patient", "doctor", "admin"]);

const LOCALES = new Set(["en", "ar"]);

function pathSegments(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && LOCALES.has(parts[0])) return parts.slice(1);
  return parts;
}

export function isAuthShellPath(pathname: string): boolean {
  const rest = pathSegments(pathname);
  return AUTH_SHELL_SEGMENTS.has(rest[0] ?? "");
}

export function isPortalShellPath(pathname: string): boolean {
  const rest = pathSegments(pathname);
  return PORTAL_SHELL_SEGMENTS.has(rest[0] ?? "");
}

export function hidesMarketingChrome(pathname: string): boolean {
  return isAuthShellPath(pathname) || isPortalShellPath(pathname);
}
