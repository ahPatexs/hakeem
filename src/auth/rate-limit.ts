import { AuthDomainError } from "./errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function take(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw new AuthDomainError("RATE_LIMITED", "Too many attempts. Please try again later.");
  }
  current.count += 1;
}

export function rateLimitLoginOrigin(ipHash: string) {
  take(`login:ip:${ipHash}`, 20, 15 * 60 * 1000);
}

export function rateLimitEmailSend(email: string, kind: string) {
  take(`email:${kind}:${email.toLowerCase()}:burst`, 1, 60 * 1000);
  take(`email:${kind}:${email.toLowerCase()}:hour`, 5, 60 * 60 * 1000);
}

export function hashIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  // Lightweight privacy-preserving hash for audit/rate-limit keys
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0;
  return `ip_${h.toString(16)}`;
}
