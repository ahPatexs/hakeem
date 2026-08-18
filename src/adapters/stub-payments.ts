import type {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentWebhookEvent,
  PaymentsPort,
  RefundPaymentInput,
  RefundPaymentResult,
  RetrievePaymentInput,
  RetrievePaymentResult,
} from "@/ports/payments";

const intentStore = new Map<string, { status: RetrievePaymentResult["status"]; captured: boolean }>();

export class StubPaymentsAdapter implements PaymentsPort {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const providerIntentId = `stub_pi_${input.obligationId}`;
    intentStore.set(providerIntentId, { status: "processing", captured: false });
    return {
      providerIntentId,
      clientSecret: `stub_secret_${input.idempotencyKey}`,
      status: "processing",
    };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentResult> {
    const known = intentStore.get(input.providerIntentId);
    return {
      providerIntentId: input.providerIntentId,
      status: known?.status ?? "pending",
      captured: known?.captured ?? false,
    };
  }

  verifyWebhookSignature(_payload: string | Buffer, signature: string): boolean {
    return signature.startsWith("stub_sig_");
  }

  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent {
    const data = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.toString());
    const raw = String(data.status ?? "paid");
    const status: PaymentWebhookEvent["status"] =
      raw === "failed" || raw === "processing" || raw === "refunded" ? raw : "paid";
    const providerIntentId = String(data.providerIntentId ?? `stub_pi_${data.obligationId}`);
    if (status === "paid") {
      intentStore.set(providerIntentId, { status: "succeeded", captured: true });
    } else if (status === "failed") {
      intentStore.set(providerIntentId, { status: "failed", captured: false });
    }
    return {
      eventId: String(data.eventId ?? `stub_evt_${Date.now()}`),
      obligationId: String(data.obligationId),
      providerIntentId,
      status,
      refundAmountCents: typeof data.refundAmountCents === "number" ? data.refundAmountCents : undefined,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      ok: true,
      providerHandled: false,
      providerRefundId: `stub_rf_${input.obligationId}_${input.amountCents}`,
      message: "Manual settlement — provider refund not executed in stub",
    };
  }

  /** Test helper: mark a stub intent as captured for reconcile. */
  markCaptured(providerIntentId: string) {
    intentStore.set(providerIntentId, { status: "succeeded", captured: true });
  }
}

export const stubPaymentsAdapter = new StubPaymentsAdapter();
