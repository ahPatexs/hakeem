import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { createNotification } from "@/lib/patient/notifications";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-stub-signature") ?? "";
    const payload = await request.text();

    if (!stubPaymentsAdapter.verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
    }

    const event = stubPaymentsAdapter.parseWebhookEvent(payload);

    const obligation = await prisma.paymentObligation.findUnique({
      where: { id: event.obligationId },
    });

    if (!obligation) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (event.status === "paid") {
      await prisma.$transaction([
        prisma.paymentObligation.update({
          where: { id: obligation.id },
          data: { status: "PAID", providerRef: event.providerIntentId },
        }),
        prisma.paymentAttempt.updateMany({
          where: { obligationId: obligation.id, providerIntentId: event.providerIntentId },
          data: { status: "PAID", rawEventId: event.eventId },
        }),
      ]);

      await createNotification({
        patientUserId: obligation.patientUserId,
        category: "PAYMENT",
        title: "Payment received",
        body: `Payment of ${(obligation.amountCents / 100).toFixed(2)} ${obligation.currency} was successful.`,
        href: `/patient/payments/${obligation.id}`,
      });
    } else {
      await prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ ok: true, eventId: event.eventId });
  } catch (error) {
    console.error("[patient/payments/webhook]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
