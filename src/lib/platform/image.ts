import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

/** Common image MIME types accepted for patient/doctor uploads. */
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Soft / hard limit for longest side (pixels). */
export const MAX_IMAGE_DIMENSION = 4096;

/** Max optimized image payload retained in storage (10 MiB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

export function isAllowedImageContentType(contentType: string): contentType is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType.toLowerCase());
}

export function imageDimensionHintMessage(locale: "en" | "ar" = "en"): string {
  return locale === "ar"
    ? `يُفضّل أن لا تتجاوز الصورة ${MAX_IMAGE_DIMENSION} بكسل`
    : `Images should not exceed ${MAX_IMAGE_DIMENSION}px on the longest side`;
}

/** Read PNG IHDR dimensions without decoding pixels. */
function readPngSize(body: Buffer): { width: number; height: number } | null {
  if (body.length < 24) return null;
  if (body[0] !== 0x89 || body[1] !== 0x50 || body[2] !== 0x4e || body[3] !== 0x47) return null;
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

/** Read JPEG SOF0/SOF2 dimensions. */
function readJpegSize(body: Buffer): { width: number; height: number } | null {
  if (body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < body.length) {
    if (body[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = body[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = body.readUInt16BE(offset + 5);
      const width = body.readUInt16BE(offset + 7);
      return { width, height };
    }
    const length = body.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

export function readImageDimensions(
  body: Buffer,
  contentType: string,
): { width: number; height: number } | null {
  const ct = contentType.toLowerCase();
  if (ct === "image/png") return readPngSize(body);
  if (ct === "image/jpeg" || ct === "image/jpg") return readJpegSize(body);
  return null;
}

/**
 * Validate and normalize image uploads: MIME allowlist, byte cap, dimension gate.
 * Full re-encode/resize requires a codec (e.g. sharp) — until then we reject oversized
 * inputs rather than silently storing unbounded images (plan:T067 / FR-013).
 */
export function optimizeImageBuffer(input: {
  body: Buffer;
  contentType: string;
  maxBytes?: number;
  maxDimension?: number;
}): PlatformResult<{ body: Buffer; contentType: string; width?: number; height?: number }> {
  const contentType = input.contentType.toLowerCase();
  if (!isAllowedImageContentType(contentType)) {
    return platformFail("VALIDATION_ERROR", "Unsupported image type");
  }

  const maxBytes = input.maxBytes ?? MAX_IMAGE_BYTES;
  if (input.body.length <= 0 || input.body.length > maxBytes) {
    return platformFail("VALIDATION_ERROR", `Image must be ≤ ${maxBytes} bytes`);
  }

  const maxDimension = input.maxDimension ?? MAX_IMAGE_DIMENSION;
  const dims = readImageDimensions(input.body, contentType);
  if (dims && (dims.width > maxDimension || dims.height > maxDimension)) {
    return platformFail(
      "VALIDATION_ERROR",
      `Image dimensions must be ≤ ${maxDimension}px on each side`,
    );
  }

  // Normalize alias MIME; buffer unchanged (no silent downscale without codec).
  const normalizedType = contentType === "image/jpg" ? "image/jpeg" : contentType;
  return platformOk({
    body: input.body,
    contentType: normalizedType,
    width: dims?.width,
    height: dims?.height,
  });
}

/** @deprecated Use MAX_IMAGE_DIMENSION */
export const MAX_IMAGE_DIMENSION_HINT = MAX_IMAGE_DIMENSION;

const DOCTOR_PHOTO_PREFIX = "doctor-photos/";

export function doctorPhotoPublicUrl(doctorId: string, version = Date.now()): string {
  return `/api/platform/files/dphoto-${doctorId}?v=${version}`;
}

export function doctorPhotoCandidateKeys(doctorId: string): string[] {
  return ["jpg", "jpeg", "png", "webp", "gif"].map((ext) => `${DOCTOR_PHOTO_PREFIX}${doctorId}.${ext}`);
}

function doctorPhotoStorageKey(doctorId: string, contentType: string): string {
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "jpg";
  return `${DOCTOR_PHOTO_PREFIX}${doctorId}.${ext}`;
}

export async function storeDoctorPhoto(input: {
  doctorId: string;
  fileName: string;
  contentType: string;
  body: Buffer;
}): Promise<{ photoUrl: string; key: string }> {
  const { AuthDomainError } = await import("@/auth/errors");
  let contentType = input.contentType.toLowerCase();
  if (!contentType || contentType === "application/octet-stream") {
    const name = input.fileName.toLowerCase();
    if (name.endsWith(".png")) contentType = "image/png";
    else if (name.endsWith(".webp")) contentType = "image/webp";
    else if (name.endsWith(".gif")) contentType = "image/gif";
    else contentType = "image/jpeg";
  }
  const optimized = optimizeImageBuffer({ body: input.body, contentType });
  if (!optimized.ok) {
    throw new AuthDomainError("VALIDATION_ERROR", optimized.message ?? "Invalid image");
  }

  const { getStorageAdapter } = await import("@/adapters");
  const storage = getStorageAdapter();
  const nextKey = doctorPhotoStorageKey(input.doctorId, optimized.data.contentType);
  for (const key of doctorPhotoCandidateKeys(input.doctorId)) {
    if (key !== nextKey) await storage.delete(key);
  }
  await storage.upload({
    key: nextKey,
    body: optimized.data.body,
    contentType: optimized.data.contentType,
  });
  return { photoUrl: doctorPhotoPublicUrl(input.doctorId), key: nextKey };
}

export async function servePublicDoctorPhoto(doctorId: string, request: Request) {
  const { NextResponse } = await import("next/server");
  const { prisma } = await import("@/lib/prisma");
  const { getStorageAdapter } = await import("@/adapters");

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { photoUrl: true },
  });
  if (!doctor) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const storage = getStorageAdapter();
  for (const key of doctorPhotoCandidateKeys(doctorId)) {
    if (!(await storage.exists(key))) continue;
    const file = await storage.download(key);
    const ext = key.split(".").pop()?.toLowerCase();
    const contentType =
      file.contentType && file.contentType !== "application/octet-stream"
        ? file.contentType
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteSize),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  const fallback = doctor.photoUrl;
  if (fallback && (fallback.startsWith("/images/") || fallback.startsWith("http"))) {
    return NextResponse.redirect(new URL(fallback, request.url));
  }
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

const PATIENT_PHOTO_PREFIX = "patient-photos/";

export function patientPhotoPublicUrl(userId: string, version = Date.now()): string {
  return `/api/platform/files/pphoto-${userId}?v=${version}`;
}

export function patientPhotoCandidateKeys(userId: string): string[] {
  return ["jpg", "jpeg", "png", "webp", "gif"].map((ext) => `${PATIENT_PHOTO_PREFIX}${userId}.${ext}`);
}

function patientPhotoStorageKey(userId: string, contentType: string): string {
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "jpg";
  return `${PATIENT_PHOTO_PREFIX}${userId}.${ext}`;
}

export async function storePatientPhoto(input: {
  userId: string;
  fileName: string;
  contentType: string;
  body: Buffer;
}): Promise<{ photoUrl: string; key: string }> {
  const { AuthDomainError } = await import("@/auth/errors");
  let contentType = input.contentType.toLowerCase();
  if (!contentType || contentType === "application/octet-stream") {
    const name = input.fileName.toLowerCase();
    if (name.endsWith(".png")) contentType = "image/png";
    else if (name.endsWith(".webp")) contentType = "image/webp";
    else if (name.endsWith(".gif")) contentType = "image/gif";
    else contentType = "image/jpeg";
  }
  const optimized = optimizeImageBuffer({ body: input.body, contentType });
  if (!optimized.ok) {
    throw new AuthDomainError("VALIDATION_ERROR", optimized.message ?? "Invalid image");
  }

  const { getStorageAdapter } = await import("@/adapters");
  const storage = getStorageAdapter();
  const nextKey = patientPhotoStorageKey(input.userId, optimized.data.contentType);
  for (const key of patientPhotoCandidateKeys(input.userId)) {
    if (key !== nextKey) await storage.delete(key);
  }
  await storage.upload({
    key: nextKey,
    body: optimized.data.body,
    contentType: optimized.data.contentType,
  });
  return { photoUrl: patientPhotoPublicUrl(input.userId), key: nextKey };
}

export async function servePublicPatientPhoto(userId: string, request: Request) {
  const { NextResponse } = await import("next/server");
  const { prisma } = await import("@/lib/prisma");
  const { getStorageAdapter } = await import("@/adapters");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const storage = getStorageAdapter();
  for (const key of patientPhotoCandidateKeys(userId)) {
    if (!(await storage.exists(key))) continue;
    const file = await storage.download(key);
    const ext = key.split(".").pop()?.toLowerCase();
    const contentType =
      file.contentType && file.contentType !== "application/octet-stream"
        ? file.contentType
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteSize),
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  const fallback = user.image;
  if (fallback && (fallback.startsWith("/images/") || fallback.startsWith("http"))) {
    return NextResponse.redirect(new URL(fallback, request.url));
  }
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}
