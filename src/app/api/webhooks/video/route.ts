import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

function signaturesMatch(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return expected === provided;
  }
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-video-signature");
    const secret = process.env.VIDEO_WEBHOOK_SECRET;
    const rawBody = await request.text();

    // Fail closed when a shared secret is configured (FR-042).
    if (secret) {
      if (!signature) {
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
      }
      const expected = createHash("sha256").update(`${secret}:${rawBody}`).digest("hex");
      if (!signaturesMatch(expected, signature)) {
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, processed: false });
  } catch (error) {
    console.error("[webhooks/video]", error);
    return NextResponse.json({ error: "INTERNAL_FAILURE" }, { status: 500 });
  }
}
