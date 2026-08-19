import { auditLog } from "@/auth/audit";
import type { Prisma } from "@prisma/client";

export type AdminAuditInput = {
  type: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  actorUserId?: string | null;
  targetUserId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  meta?: Prisma.InputJsonValue;
};

export async function adminAudit(input: AdminAuditInput) {
  await auditLog(input);
}

export const ADMIN_AUDIT_TYPES = {
  accessDenied: "admin.access.denied",
  userSuspend: "admin.user.suspend",
  userReinstate: "admin.user.reinstate",
  userDeactivate: "admin.user.deactivate",
  userUnlock: "auth.unlock",
  userRevokeSessions: "admin.user.revoke_sessions",
  doctorApprove: "admin.doctor.approve",
  doctorReject: "admin.doctor.reject",
  doctorSuspend: "admin.doctor.suspend",
  appointmentCancel: "admin.appointment.cancel",
  appointmentFlag: "admin.appointment.flag",
  billingRefund: "admin.billing.refund",
  billingDispute: "admin.billing.dispute",
  settingsChange: "admin.settings.change",
  aiToggle: "admin.ai.toggle",
  aiUserDisable: "admin.ai.user_disable",
  aiUserEnable: "admin.ai.user_enable",
  aiFlagReview: "admin.ai.flag_review",
  announcementPublish: "admin.announcement.publish",
  exportAudit: "admin.export.audit",
  exportAnalytics: "admin.export.analytics",
  healthView: "admin.health.view",
  billingPaySubmit: "billing.pay_submit",
  billingPaid: "billing.paid",
  billingFailed: "billing.failed",
  billingCancelled: "billing.cancelled",
  billingRefundRequest: "billing.refund_request",
  billingRefundDecision: "billing.refund_decision",
  billingRefundExecuted: "billing.refund_executed",
  billingReconcileCorrection: "billing.reconcile_correction",
  billingInvoiceDownload: "billing.invoice_download",
  billingConfigChange: "billing.config_change",
} as const;
