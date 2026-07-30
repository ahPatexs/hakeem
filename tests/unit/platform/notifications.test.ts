import { describe, expect, it } from "vitest";
import {
  EVENT_CHANNEL_MATRIX,
  getEventChannelPolicy,
  resolveEffectiveChannels,
} from "@/domain/platform/notifications";
import { platformPartial } from "@/domain/platform/outcomes";

describe("notification channel matrix", () => {
  it("defines security events as transactional with mandatory inApp+email", () => {
    expect(EVENT_CHANNEL_MATRIX["auth.verify"].transactionalSecurity).toBe(true);
    expect(EVENT_CHANNEL_MATRIX["security.alert"].transactionalSecurity).toBe(true);
  });

  it("keeps email mandatory for security even when user opts out", () => {
    const channels = resolveEffectiveChannels("security.alert", {
      notifySystemEmail: false,
      notifyAppointmentEmail: false,
    });
    expect(channels.inApp).toBe(true);
    expect(channels.email).toBe(true);
  });

  it("honors appointment email preference for non-security events", () => {
    const off = resolveEffectiveChannels("appointment.confirmed", { notifyAppointmentEmail: false });
    expect(off.email).toBe(false);
    expect(off.inApp).toBe(true);
  });

  it("defaults unknown events to in-app only", () => {
    const policy = getEventChannelPolicy("custom.event");
    expect(policy).toEqual({ inApp: true, email: false, sms: false, push: false });
  });
});

describe("PartialSuccess outcome", () => {
  it("marks partial when some channel mirrors fail", () => {
    const result = platformPartial({ notificationId: "n1" }, {
      email: "OK",
      sms: "DEPENDENCY_UNAVAILABLE",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBe("PARTIAL_SUCCESS");
      expect(result.channelStatuses?.sms).toBe("DEPENDENCY_UNAVAILABLE");
    }
  });
});
