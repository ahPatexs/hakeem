import { mkdir, readFile, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import type { StorageDownloadResult, StoragePort, StorageUploadInput } from "@/ports/storage";

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

function resolveKey(key: string): string {
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_ROOT, normalized);
  if (!full.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

export class LocalStorageAdapter implements StoragePort {
  async upload(input: StorageUploadInput): Promise<{ key: string }> {
    const filePath = resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
    await writeFile(filePath, body);
    return { key: input.key };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const filePath = resolveKey(key);
    const body = await readFile(filePath);
    const ext = path.extname(key).toLowerCase();
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";
    return { body, contentType, byteSize: body.byteLength };
  }

  async delete(key: string): Promise<void> {
    const filePath = resolveKey(key);
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
