import { describe, expect, it } from "vitest";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { formatInvoiceNumber } from "@/domain/billing/invoices";
import { resolveWebhookTransition } from "@/domain/platform/webhooks";

describe("payment flow (intent → processing → paid + invoice)", () => {
  it("creates a stub intent then applies paid webhook transition and invoice format", async () => {
    const intent = await stubPaymentsAdapter.createPaymentIntent({
      obligationId: "ob-flow-1",
      amountCents: 15000,
      currency: "SAR",
      idempotencyKey: "appt:ob-flow-1",
      patientUserId: "user-1",
    });
    expect(intent.status).toBe("processing");
    expect(intent.clientSecret?.startsWith("stub_secret_")).toBe(true);

    expect(resolveWebhookTransition("PENDING", "processing")).toBe("PROCESSING");
    expect(resolveWebhookTransition("PROCESSING", "paid")).toBe("PAID");
    expect(formatInvoiceNumber(2026, 1)).toBe("HK-INV-2026-000001");

    const retrieved = await stubPaymentsAdapter.retrievePayment({
      providerIntentId: intent.providerIntentId,
      obligationId: "ob-flow-1",
    });
    expect(retrieved.captured).toBe(false);

    const event = stubPaymentsAdapter.parseWebhookEvent(
      JSON.stringify({
        eventId: "evt-paid-1",
        obligationId: "ob-flow-1",
        providerIntentId: intent.providerIntentId,
        status: "paid",
      }),
    );
    expect(event.status).toBe("paid");
    const after = await stubPaymentsAdapter.retrievePayment({
      providerIntentId: intent.providerIntentId,
      obligationId: "ob-flow-1",
    });
    expect(after.captured).toBe(true);
  });
});
