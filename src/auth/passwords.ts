import { compare, hash } from "bcryptjs";
import { AuthDomainError } from "./errors";

/** Spec prefers Argon2id; bcrypt (cost 12) is the portable production-ready equivalent used here. */
const BCRYPT_ROUNDS = 12;
const HISTORY_LIMIT = 5;

export const passwordSchemaMessage =
  "Password must be at least 12 characters and include upper, lower, digit, and special character";

export function validatePasswordPolicy(password: string, email?: string): void {
  if (password.length < 12) throw new AuthDomainError("PASSWORD_POLICY", passwordSchemaMessage);
  if (!/[A-Z]/.test(password)) throw new AuthDomainError("PASSWORD_POLICY", passwordSchemaMessage);
  if (!/[a-z]/.test(password)) throw new AuthDomainError("PASSWORD_POLICY", passwordSchemaMessage);
  if (!/[0-9]/.test(password)) throw new AuthDomainError("PASSWORD_POLICY", passwordSchemaMessage);
  if (!/[^A-Za-z0-9]/.test(password)) throw new AuthDomainError("PASSWORD_POLICY", passwordSchemaMessage);

  if (email) {
    const normalized = email.trim().toLowerCase();
    const local = normalized.split("@")[0] ?? "";
    if (password.toLowerCase() === normalized || password.toLowerCase() === local) {
      throw new AuthDomainError("PASSWORD_POLICY", "Password must not match your email");
    }
  }

  const common = ["password123!", "Welcome123!", "Hakeem123456!", "Admin123456!"];
  if (common.some((c) => c.toLowerCase() === password.toLowerCase())) {
    throw new AuthDomainError("PASSWORD_POLICY", "Password is too common");
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function assertNotInPasswordHistory(
  password: string,
  historyHashes: string[],
): Promise<void> {
  for (const prev of historyHashes.slice(0, HISTORY_LIMIT)) {
    if (await verifyPassword(password, prev)) {
      throw new AuthDomainError("PASSWORD_REUSED", "Cannot reuse a recent password");
    }
  }
}

export { HISTORY_LIMIT };
