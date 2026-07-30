type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}

class ConsoleEmailSender implements EmailSender {
  async send(input: SendEmailInput): Promise<void> {
    console.info("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}

/** Production Resend adapter (D10) — activated when RESEND_API_KEY is set. */
class ResendEmailSender implements EmailSender {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<void> {
    const from = process.env.EMAIL_FROM ?? "Hakeem <noreply@hakeem.local>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${input.text}</pre>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email:resend]", res.status, body);
      throw new Error("EMAIL_SEND_FAILED");
    }
  }
}

/**
 * SMTP placeholder — logs when SMTP_HOST is set without a transport library.
 * Wire nodemailer/similar in ops without changing call sites.
 */
class SmtpPlaceholderSender implements EmailSender {
  async send(input: SendEmailInput): Promise<void> {
    console.info("[email:smtp]", {
      host: process.env.SMTP_HOST,
      to: input.to,
      subject: input.subject,
    });
  }
}

function resolveSender(): EmailSender {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) return new ResendEmailSender(resendKey);
  if (process.env.SMTP_HOST) return new SmtpPlaceholderSender();
  return new ConsoleEmailSender();
}

let sender: EmailSender = resolveSender();

export function setEmailSender(next: EmailSender) {
  sender = next;
}

export function getEmailSender(): EmailSender {
  return sender;
}

export async function sendAuthEmail(input: SendEmailInput & { purpose?: string; idempotencyKey?: string }) {
  const { createHash } = await import("node:crypto");
  const { sendEmail } = await import("@/lib/platform/email");
  const purpose = input.purpose ?? "auth.transactional";
  const digest = createHash("sha256").update(`${input.to}|${input.subject}|${input.text}`).digest("hex").slice(0, 24);
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    purpose,
    idempotencyKey: input.idempotencyKey ?? `auth:${purpose}:${digest}`,
  });
  if (!result.ok) {
    if (result.code === "RATE_LIMITED") {
      const { AuthDomainError } = await import("@/auth/errors");
      throw new AuthDomainError("RATE_LIMITED", result.message);
    }
    throw new Error(result.code);
  }
}
