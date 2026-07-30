import { NextResponse } from "next/server";
import { applyPaymentWebhook } from "@/lib/platform/payments";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-stub-signature") ?? "";
    const rawBody = await request.text();

    const result = await applyPaymentWebhook({ rawBody, signature });
    if (!result.ok) {
      const status = result.code === "VALIDATION_ERROR" ? 400 : 500;
      return NextResponse.json({ error: result.code, message: result.message }, { status });
    }

    return NextResponse.json({
      ok: true,
      eventId: result.data.eventId,
      applied: result.data.applied,
    });
  } catch (error) {
    console.error("[webhooks/payments]", error);
    return NextResponse.json({ error: "INTERNAL_FAILURE" }, { status: 500 });
  }
}
