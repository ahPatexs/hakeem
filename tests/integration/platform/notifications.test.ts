import { describe, expect, it } from "vitest";
import { resolveEffectiveChannels } from "@/domain/platform/notifications";
import { platformPartial } from "@/domain/platform/outcomes";

describe("notification service contract", () => {
  it("security events keep mandatory channels despite prefs", () => {
    const channels = resolveEffectiveChannels("auth.verify", { notifySystemEmail: false });
    expect(channels.inApp).toBe(true);
    expect(channels.email).toBe(true);
  });

  it("PartialSuccess preserves in-app success when SMS mirror fails", () => {
    const result = platformPartial({ notificationId: "notif-1" }, {
      inApp: "OK",
      email: "OK",
      sms: "DEPENDENCY_UNAVAILABLE",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBe("PARTIAL_SUCCESS");
      expect(result.data.notificationId).toBe("notif-1");
    }
  });
});
