import type { PushPort, PushSendInput } from "@/ports/push";

export class StubPushAdapter implements PushPort {
  async send(input: PushSendInput): Promise<void> {
    if (process.env.PLATFORM_PUSH_ENABLED !== "true") {
      console.info("[push:stub:skipped]", {
        userId: input.userId,
        title: input.title,
        idempotencyKey: input.idempotencyKey,
      });
      return;
    }
    console.info("[push:stub]", {
      userId: input.userId,
      title: input.title,
      href: input.href,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async ping(): Promise<boolean> {
    return process.env.PLATFORM_PUSH_ENABLED === "true";
  }
}

export const stubPushAdapter = new StubPushAdapter();
