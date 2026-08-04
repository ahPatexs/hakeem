import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

/**
 * FR-044: provider base URLs and absolute download links must use HTTPS in production.
 * Relative same-origin paths (e.g. `/api/...`) are allowed.
 */
export function assertHttpsUrl(
  url: string,
  options?: { allowRelative?: boolean },
): PlatformResult<undefined> {
  const trimmed = url.trim();
  if (!trimmed) return platformFail("VALIDATION_ERROR", "URL is required");

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (options?.allowRelative === false) {
      return platformFail("VALIDATION_ERROR", "Absolute HTTPS URL required");
    }
    return platformOk(undefined);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return platformFail("VALIDATION_ERROR", "Invalid URL");
  }

  const isProd = process.env.NODE_ENV === "production";
  const secure = parsed.protocol === "https:" || parsed.protocol === "wss:";
  const insecureOk = parsed.protocol === "http:" || parsed.protocol === "ws:";

  if (isProd && !secure) {
    return platformFail("VALIDATION_ERROR", "HTTPS/WSS required in production");
  }

  if (!secure && !insecureOk) {
    return platformFail("VALIDATION_ERROR", "Unsupported URL protocol");
  }

  return platformOk(undefined);
}

export function requireHttpsUrl(url: string, options?: { allowRelative?: boolean }): void {
  const result = assertHttpsUrl(url, options);
  if (!result.ok) {
    throw new Error(result.message ?? result.code);
  }
}
