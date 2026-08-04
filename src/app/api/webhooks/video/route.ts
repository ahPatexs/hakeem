import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyVideoWebhookEvent } from "@/lib/platform/video";
import { platformAudit } from "@/lib/platform/audit";

const SKEW_MS = 5 * 60 * 1000;

function signaturesMatch(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return expected === provided;
  }
}

function parseTimestampMs(value: string | null): number | null {
  if (!value) return null;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    return asNumber < 1e12 ? asNumber * 1000 : asNumber;
  }
  const asDate = Date.parse(value);
  return Number.isNaN(asDate) ? null : asDate;
}

export async function POST(request: Request) {
  try {
    const signature =
      request.headers.get("x-video-signature") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      null;
    const timestampHeader =
      request.headers.get("x-video-timestamp") ?? request.headers.get("x-livekit-timestamp");
    const secret = process.env.VIDEO_WEBHOOK_SECRET ?? process.env.LIVEKIT_API_SECRET;
    const rawBody = await request.text();
    const rawHash = createHash("sha256").update(rawBody).digest("hex");

    if (secret) {
      if (!signature) {
        await platformAudit({
          type: "platform.video.webhook",
          outcome: "DENIED",
          meta: { reason: "missing_signature" },
        });
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
      }
      const expected = createHash("sha256").update(`${secret}:${rawBody}`).digest("hex");
      if (!signaturesMatch(expected, signature) && signature !== secret) {
        await platformAudit({
          type: "platform.video.webhook",
          outcome: "DENIED",
          meta: { reason: "bad_signature" },
        });
        return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
      }

      const ts = parseTimestampMs(timestampHeader);
      if (ts != null && Math.abs(Date.now() - ts) > SKEW_MS) {
        await platformAudit({
          type: "platform.video.webhook",
          outcome: "DENIED",
          meta: { reason: "stale_timestamp" },
        });
        return NextResponse.json({ error: "STALE_TIMESTAMP" }, { status: 400 });
      }
    }

    let eventType = "unknown";
    let providerEventId = rawHash.slice(0, 32);
    let roomName: string | undefined;
    try {
      const parsed = JSON.parse(rawBody) as {
        id?: string;
        event?: string;
        room?: { name?: string };
        roomName?: string;
      };
      if (typeof parsed.id === "string") providerEventId = parsed.id;
      if (typeof parsed.event === "string") eventType = parsed.event;
      roomName = parsed.room?.name ?? parsed.roomName;
    } catch {
      // Non-JSON body still acknowledged after signature checks.
    }

    const applied = await applyVideoWebhookEvent({
      providerEventId,
      eventType,
      roomName,
      rawHash,
    });

    return NextResponse.json({
      ok: true,
      processed: applied.ok ? applied.data.applied : false,
    });
  } catch (error) {
    console.error("[webhooks/video]", error);
    return NextResponse.json({ error: "INTERNAL_FAILURE" }, { status: 500 });
  }
}
