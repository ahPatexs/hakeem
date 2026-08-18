export type PaymentProviderStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";

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

export interface RetrievePaymentInput {
  providerIntentId: string;
  obligationId: string;
}

export interface RetrievePaymentResult {
  providerIntentId: string;
  status: PaymentProviderStatus;
  captured: boolean;
  capturedAmountCents?: number;
}

export interface PaymentWebhookEvent {
  eventId: string;
  obligationId: string;
  providerIntentId: string;
  status: "processing" | "paid" | "failed" | "refunded";
  refundAmountCents?: number;
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
  retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent;
  refund?(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
