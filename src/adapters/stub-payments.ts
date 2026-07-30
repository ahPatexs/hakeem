import type {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentWebhookEvent,
  PaymentsPort,
} from "@/ports/payments";

export class StubPaymentsAdapter implements PaymentsPort {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const providerIntentId = `stub_pi_${input.obligationId}`;
    return {
      providerIntentId,
      clientSecret: `stub_secret_${input.idempotencyKey}`,
      status: "pending",
    };
  }

  verifyWebhookSignature(_payload: string | Buffer, signature: string): boolean {
    return signature.startsWith("stub_sig_");
  }

  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent {
    const data = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.toString());
    return {
      eventId: String(data.eventId ?? `stub_evt_${Date.now()}`),
      obligationId: String(data.obligationId),
      providerIntentId: String(data.providerIntentId ?? `stub_pi_${data.obligationId}`),
      status: data.status === "failed" ? "failed" : "paid",
    };
  }
}

export const stubPaymentsAdapter = new StubPaymentsAdapter();
