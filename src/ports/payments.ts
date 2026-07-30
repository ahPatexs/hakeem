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

export interface PaymentsPort {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent;
}
