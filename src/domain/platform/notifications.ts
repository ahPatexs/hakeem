export type NotificationEventType =
  | "appointment.confirmed"
  | "payment.received"
  | "auth.verify"
  | "security.alert"
  | "admin.ops"
  | "clinical.visit_summary";

export type ChannelPolicy = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  /** Transactional security events cannot fully opt out of email + inApp */
  transactionalSecurity?: boolean;
};

export const EVENT_CHANNEL_MATRIX: Record<NotificationEventType, ChannelPolicy> = {
  "appointment.confirmed": { inApp: true, email: true, sms: false, push: true },
  "payment.received": { inApp: true, email: true, sms: false, push: false },
  "auth.verify": { inApp: true, email: true, sms: false, push: false, transactionalSecurity: true },
  "security.alert": { inApp: true, email: true, sms: true, push: true, transactionalSecurity: true },
  "admin.ops": { inApp: true, email: false, sms: false, push: false },
  "clinical.visit_summary": { inApp: true, email: true, sms: false, push: true },
};

export function getEventChannelPolicy(eventType: string): ChannelPolicy {
  return (
    EVENT_CHANNEL_MATRIX[eventType as NotificationEventType] ?? {
      inApp: true,
      email: false,
      sms: false,
      push: false,
    }
  );
}

export type EmailNotifyPreferenceKey =
  | "notifyAppointmentEmail"
  | "notifyClinicalEmail"
  | "notifyPrescriptionEmail"
  | "notifyPaymentEmail"
  | "notifySystemEmail";

/** Resolve effective channels after user prefs; security/auth events keep inApp+email mandatory. */
export function resolveEffectiveChannels(
  eventType: string,
  prefs: Partial<Record<EmailNotifyPreferenceKey, boolean>> = {},
): ChannelPolicy {
  const base = getEventChannelPolicy(eventType);

  if (base.transactionalSecurity) {
    return { ...base, inApp: true, email: true };
  }

  let email = base.email;
  if (eventType.startsWith("appointment.")) email = email && (prefs.notifyAppointmentEmail ?? true);
  else if (eventType.startsWith("clinical.")) email = email && (prefs.notifyClinicalEmail ?? true);
  else if (eventType.startsWith("payment.")) email = email && (prefs.notifyPaymentEmail ?? true);
  else if (eventType.startsWith("auth.") || eventType.startsWith("security."))
    email = email && (prefs.notifySystemEmail ?? true);
  else if (eventType === "admin.ops") email = false;

  return { ...base, email };
}
