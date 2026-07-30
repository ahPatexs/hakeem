export interface SmsSendInput {
  to: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
}

export interface SmsPort {
  send(input: SmsSendInput): Promise<{ id: string }>;
  ping?(): Promise<boolean>;
}
