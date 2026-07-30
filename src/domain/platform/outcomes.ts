export type PlatformCode =
  | "OK"
  | "PARTIAL_SUCCESS"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_FAILURE";

export type PlatformResult<T> =
  | {
      ok: true;
      data: T;
      code?: "OK" | "PARTIAL_SUCCESS";
      channelStatuses?: Record<string, PlatformCode>;
    }
  | { ok: false; code: PlatformCode; message?: string };

export function platformOk<T>(
  data: T,
  opts?: { code?: "OK" | "PARTIAL_SUCCESS"; channelStatuses?: Record<string, PlatformCode> },
): PlatformResult<T> {
  return { ok: true, data, code: opts?.code ?? "OK", channelStatuses: opts?.channelStatuses };
}

export function platformPartial<T>(
  data: T,
  channelStatuses: Record<string, PlatformCode>,
): PlatformResult<T> {
  return { ok: true, data, code: "PARTIAL_SUCCESS", channelStatuses };
}

export function platformFail(code: PlatformCode, message?: string): PlatformResult<never> {
  return { ok: false, code, message };
}
