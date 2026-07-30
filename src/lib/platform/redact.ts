const SECRET_KEY_PATTERN =
  /(password|secret|token|api[_-]?key|authorization|bearer|credential|private[_-]?key|client[_-]?secret)/i;

const SECRET_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /sk_[A-Za-z0-9]+/g,
  /re_[A-Za-z0-9]+/g,
];

const REDACTED = "[REDACTED]";

function redactString(value: string): string {
  let out = value;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

export function redactSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value) as T;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item)) as T;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redactSecrets(val);
    }
  }
  return out as T;
}

export function redactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactString(message).slice(0, 500);
}
