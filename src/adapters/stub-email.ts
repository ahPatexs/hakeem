import { getEmailSender } from "@/auth/email";
import type { EmailPort, EmailSendInput } from "@/ports/email";

/**
 * Stub adapter sends via the raw Auth transport (`getEmailSender`), NOT `sendAuthEmail`.
 * Calling `sendAuthEmail` would re-enter platform `sendEmail` and mint a new OutboundMessage
 * under a different idempotency digest (FR-030).
 */
export class StubEmailAdapter implements EmailPort {
  async send(input: EmailSendInput): Promise<{ id: string }> {
    await getEmailSender().send({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { id: `stub_email_${input.idempotencyKey}` };
  }

  async ping(): Promise<boolean> {
    return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.NODE_ENV !== "production");
  }
}

export const stubEmailAdapter = new StubEmailAdapter();
