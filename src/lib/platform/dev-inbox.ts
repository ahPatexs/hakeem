import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DevInboxItem = {
  to: string;
  subject: string;
  text: string;
  at: string;
};

const FILE = join(process.cwd(), ".data", "dev-inbox.json");

export function isLocalEmailInbox() {
  return process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;
}

function readAll(): DevInboxItem[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as DevInboxItem[];
  } catch {
    return [];
  }
}

export function writeDevInbox(item: Omit<DevInboxItem, "at">) {
  if (!isLocalEmailInbox()) return;
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  const next = [{ ...item, to: item.to.toLowerCase(), at: new Date().toISOString() }, ...readAll()].slice(0, 20);
  writeFileSync(FILE, JSON.stringify(next, null, 2), "utf8");
}

export function readDevInbox(email: string): DevInboxItem | null {
  if (!isLocalEmailInbox()) return null;
  const to = email.toLowerCase().trim();
  return readAll().find((row) => row.to === to) ?? null;
}

export function extractLink(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match?.[0] ?? null;
}
