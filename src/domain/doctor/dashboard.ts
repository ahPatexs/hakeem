/** Dashboard widget caps per FR-004 (clarified 2026-07-30). */
export const DOCTOR_DASHBOARD_CAPS = {
  todayAppointments: 8,
  upcomingConsultations: 5,
  pendingNotes: 5,
  recentPatients: 5,
  notificationPreview: 5,
} as const;

/** AI generations allowed per doctor per rolling hour (FR-018). */
export const AI_RATE_LIMIT_PER_HOUR = 30;

/** Pending notes older than this raise a documentation notification. */
export const PENDING_NOTES_AGING_MS = 24 * 60 * 60 * 1000;
