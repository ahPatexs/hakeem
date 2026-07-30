import type { SmsPort, SmsSendInput } from "@/ports/sms";

export class StubSmsAdapter implements SmsPort {
  async send(input: SmsSendInput): Promise<{ id: string }> {
    console.info("[sms:stub]", {
      to: input.to.replace(/\d(?=\d{4})/g, "*"),
      purpose: input.purpose,
      idempotencyKey: input.idempotencyKey,
    });
    return { id: `stub_sms_${input.idempotencyKey}` };
  }

  async ping(): Promise<boolean> {
    return false;
  }
}

export const stubSmsAdapter = new StubSmsAdapter();
