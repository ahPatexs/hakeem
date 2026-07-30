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
