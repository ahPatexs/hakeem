import { createHash } from "node:crypto";

export function hashIdempotencyKey(
  ...parts: (string | number | boolean | null | undefined)[]
): string {
  const normalized = parts
    .filter((part) => part !== null && part !== undefined)
    .map(String)
    .join(":");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function outboundIdempotencyKey(parts: {
  purpose: string;
  recipient: string;
  eventId: string;
}): string {
  return `${parts.purpose}:${parts.recipient}:${parts.eventId}`;
}

export function jobIdempotencyKey(type: string, key: string): string {
  return `${type}:${key}`;
}
