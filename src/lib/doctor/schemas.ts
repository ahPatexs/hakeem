import { z } from "zod";

export const cuidSchema = z.string().min(10).max(64);

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

// ── Consultation lifecycle ────────────────────────────────────────────────

export const appointmentIdSchema = z.object({ appointmentId: cuidSchema });

export const markNoShowSchema = z.object({
  appointmentId: cuidSchema,
  reason: z.string().trim().max(500).optional(),
});

// ── SOAP / Clinical summary ───────────────────────────────────────────────

const soapSection = z.string().max(20_000).default("");

export const saveSoapDraftSchema = z.object({
  appointmentId: cuidSchema,
  noteId: cuidSchema.optional(),
  expectedVersion: z.number().int().min(1).optional(),
  subjective: soapSection,
  objective: soapSection,
  assessment: soapSection,
  plan: soapSection,
  aiAssisted: z.boolean().default(false),
});

export const finalizeSoapSchema = z.object({
  noteId: cuidSchema,
  expectedVersion: z.number().int().min(1),
});

export const amendSoapSchema = z.object({
  noteId: cuidSchema,
  reason: z.string().trim().min(3).max(1_000),
  subjective: soapSection,
  objective: soapSection,
  assessment: soapSection,
  plan: soapSection,
});

export const saveSummarySchema = z.object({
  appointmentId: cuidSchema,
  summaryId: cuidSchema.optional(),
  expectedVersion: z.number().int().min(1).optional(),
  body: z.string().max(40_000).default(""),
  aiAssisted: z.boolean().default(false),
});

export const finalizeSummarySchema = z.object({
  summaryId: cuidSchema,
  expectedVersion: z.number().int().min(1),
});

export const dismissSoapSchema = z.object({
  noteId: cuidSchema,
  reason: z.string().trim().min(3).max(1_000),
});

export const dismissSummarySchema = z.object({
  summaryId: cuidSchema,
  reason: z.string().trim().min(3).max(1_000),
});

// ── Prescriptions ─────────────────────────────────────────────────────────

export const prescriptionLineSchema = z.object({
  medicationName: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(120).optional(),
  route: z.string().trim().max(120).optional(),
  frequency: z.string().trim().max(120).optional(),
  duration: z.string().trim().max(120).optional(),
  quantity: z.string().trim().max(120).optional(),
  instructions: z.string().trim().max(2_000).optional(),
});

export const savePrescriptionDraftSchema = z.object({
  prescriptionId: cuidSchema.optional(),
  patientUserId: cuidSchema,
  appointmentId: cuidSchema.optional(),
  expectedVersion: z.number().int().min(1).optional(),
  instructions: z.string().trim().max(4_000).default(""),
  aiAssisted: z.boolean().default(false),
  lines: z.array(prescriptionLineSchema).min(1).max(20),
});

export const signPrescriptionSchema = z.object({
  prescriptionId: cuidSchema,
  expectedVersion: z.number().int().min(1),
  password: z.string().min(1).max(200),
  interactionAck: z.boolean().default(false),
  allergyDataUnavailableAck: z.boolean().default(false),
});

// ── Records / labs ────────────────────────────────────────────────────────

export const markLabReviewedSchema = z.object({ labResultId: cuidSchema });

export const patientIdSchema = z.object({ patientUserId: cuidSchema });

export const patientSearchSchema = z.object({
  query: z.string().trim().max(120).default(""),
  page: z.number().int().min(1).max(500).default(1),
});

// ── AI ────────────────────────────────────────────────────────────────────

export const doctorAiSendSchema = z.object({
  conversationId: cuidSchema.optional(),
  mode: z.enum(["MEDICAL", "DOCUMENTATION", "PRESCRIPTION"]).default("MEDICAL"),
  patientUserId: cuidSchema.optional(),
  appointmentId: cuidSchema.optional(),
  content: z.string().trim().min(1).max(8_000),
});

// ── Notifications ─────────────────────────────────────────────────────────

export const notificationIdSchema = z.object({ notificationId: cuidSchema });

// ── Profile / settings ────────────────────────────────────────────────────

export const updateDoctorProfileSchema = z.object({
  bio: z.string().trim().max(4_000).optional(),
  languages: z.array(z.string().trim().min(2).max(10)).max(10).default([]),
  timezone: z.string().trim().max(60).optional(),
});

export const updateDoctorSettingsSchema = z.object({
  locale: z.enum(["EN", "AR"]),
  theme: z.enum(["system", "light", "dark"]),
  notifyAppointmentEmail: z.boolean(),
  notifyClinicalEmail: z.boolean(),
  notifyPrescriptionEmail: z.boolean(),
  notifySystemEmail: z.boolean(),
});
