import { describe, expect, it } from "vitest";
import { optimizeImageBuffer, isAllowedImageContentType } from "@/lib/platform/image";

describe("image optimize helper", () => {
  it("rejects unsupported types", () => {
    expect(isAllowedImageContentType("application/pdf")).toBe(false);
    const result = optimizeImageBuffer({
      body: Buffer.from("x"),
      contentType: "application/pdf",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts small PNG with valid IHDR", () => {
    // 1x1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const result = optimizeImageBuffer({ body: png, contentType: "image/png" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contentType).toBe("image/png");
      expect(result.data.width).toBe(1);
      expect(result.data.height).toBe(1);
    }
  });
});
