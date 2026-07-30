import { describe, expect, it } from "vitest";
import * as notifications from "@/lib/platform/notifications";
import * as payments from "@/lib/platform/payments";
import * as billing from "@/lib/platform/billing";
import * as email from "@/lib/platform/email";
import * as sms from "@/lib/platform/sms";
import * as push from "@/lib/platform/push";
import * as ai from "@/lib/platform/ai";
import * as jobs from "@/lib/platform/jobs";

describe("platform facade inventory", () => {
  it("exports notify and read helpers", () => {
    expect(typeof notifications.notify).toBe("function");
    expect(typeof notifications.markNotificationRead).toBe("function");
    expect(typeof notifications.markAllNotificationsRead).toBe("function");
  });

  it("exports payment and billing facades", () => {
    expect(typeof payments.createPaymentIntent).toBe("function");
    expect(typeof payments.applyPaymentWebhook).toBe("function");
    expect(typeof billing.refundObligation).toBe("function");
  });

  it("exports outbound channel facades", () => {
    expect(typeof email.sendEmail).toBe("function");
    expect(typeof sms.sendSms).toBe("function");
    expect(typeof push.sendPush).toBe("function");
  });

  it("exports AI and job facades", () => {
    expect(typeof ai.assertAiAllowed).toBe("function");
    expect(typeof ai.chat).toBe("function");
    expect(typeof jobs.enqueue).toBe("function");
    expect(typeof jobs.processDueJobs).toBe("function");
  });
});
