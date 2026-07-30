export interface EmailSendInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: string;
  locale?: "en" | "ar";
  idempotencyKey: string;
}

export interface EmailPort {
  send(input: EmailSendInput): Promise<{ id: string }>;
  ping?(): Promise<boolean>;
}
