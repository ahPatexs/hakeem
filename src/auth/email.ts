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

export async function sendAuthEmail(input: SendEmailInput) {
  await getEmailSender().send(input);
}
