import { prisma } from "@/lib/prisma";
import type { StorageDownloadResult, StoragePort, StorageUploadInput } from "@/ports/storage";

export class DbStorageAdapter implements StoragePort {
  async upload(input: StorageUploadInput): Promise<{ key: string }> {
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
    const bytes = Uint8Array.from(body);
    await prisma.storageObject.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        contentType: input.contentType,
        body: bytes,
        byteSize: bytes.byteLength,
      },
      update: {
        contentType: input.contentType,
        body: bytes,
        byteSize: bytes.byteLength,
      },
    });
    return { key: input.key };
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const row = await prisma.storageObject.findUnique({ where: { key } });
    if (!row) throw new Error("Storage object not found");
    const body = Buffer.from(row.body);
    return { body, contentType: row.contentType, byteSize: row.byteSize };
  }

  async delete(key: string): Promise<void> {
    await prisma.storageObject.delete({ where: { key } }).catch(() => undefined);
  }

  async exists(key: string): Promise<boolean> {
    const row = await prisma.storageObject.findUnique({
      where: { key },
      select: { key: true },
    });
    return Boolean(row);
  }
}

export const dbStorageAdapter = new DbStorageAdapter();