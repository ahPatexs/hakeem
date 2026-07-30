export type PaymentProviderStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface CreatePaymentIntentInput {
  obligationId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  description?: string;
  patientUserId: string;
}

export interface PaymentIntentResult {
  providerIntentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: PaymentProviderStatus;
}

export interface PaymentWebhookEvent {
  eventId: string;
  obligationId: string;
  providerIntentId: string;
  status: "paid" | "failed";
}

export interface RefundPaymentInput {
  obligationId: string;
  providerRef?: string | null;
  amountCents: number;
  reason: string;
}

export interface RefundPaymentResult {
  ok: boolean;
  providerRefundId?: string;
  /** When false, caller should mark manual settlement */
  providerHandled: boolean;
  message?: string;
}

export interface PaymentsPort {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent;
  /** Optional; stub adapters may return providerHandled:false for manual ops */
  refund?(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
