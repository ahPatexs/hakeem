import type { AiDraftArtifact, AiDraftKind, Prisma } from "@prisma/client";
import { assertAiFeatureAccess } from "@/domain/ai/access";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { saveSoapDraft, saveSummaryDraft } from "@/lib/emr/notes";
import { resolveLocaleForUser } from "@/lib/platform/localization";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";
import { checkBudget } from "./budgets";
import { acceptRxDraft, type RxFields } from "./clinical-support";
import { recordUsage } from "./metering";
import { generate } from "./orchestration";
import { checkAiRateLimit } from "./rate-limit";

export type SoapFields = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type SummaryContent = { body: string };

export type DraftEvidence = {
  chartCategories: string[];
  kbSources: string[];
};

export type DraftContent = SoapFields | SummaryContent;

function toEvidence(raw: {
  chartCategories: string[];
  kbSources: Array<{ title: string }>;
}): DraftEvidence {
  return {
    chartCategories: raw.chartCategories,
    kbSources: raw.kbSources.map((s) => s.title),
  };
}

function asSoapFields(value: unknown): SoapFields | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.subjective !== "string" &&
    typeof o.objective !== "string" &&
    typeof o.assessment !== "string" &&
    typeof o.plan !== "string"
  ) {
    return null;
  }
  return {
    subjective: String(o.subjective ?? ""),
    objective: String(o.objective ?? ""),
    assessment: String(o.assessment ?? ""),
    plan: String(o.plan ?? ""),
  };
}

function asSummaryContent(value: unknown): SummaryContent | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.body !== "string") return null;
  return { body: o.body };
}

/** Parse model text into SOAP fields (JSON preferred, section headers as fallback). */
export function parseSoapContent(raw: string, doctorInput?: string): SoapFields {
  const jsonMatch = raw.match(/\{[\s\S]*?"subjective"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = asSoapFields(JSON.parse(jsonMatch[0]));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }

  const extract = (labels: string[]): string => {
    for (const label of labels) {
      const re = new RegExp(
        `${label}\\s*[:\\-]\\s*([\\s\\S]*?)(?=(?:Subjective|Objective|Assessment|Plan|S|O|A|P)\\s*[:\\-]|$)`,
        "i",
      );
      const m = re.exec(raw);
      if (m?.[1]?.trim()) return m[1].trim().slice(0, 4000);
    }
    return "";
  };

  const fields: SoapFields = {
    subjective: extract(["Subjective", "S"]),
    objective: extract(["Objective", "O"]),
    assessment: extract(["Assessment", "A"]),
    plan: extract(["Plan", "P"]),
  };

  if (!fields.subjective && !fields.objective && !fields.assessment && !fields.plan) {
    return {
      subjective: (doctorInput ?? "").slice(0, 4000),
      objective: "",
      assessment: raw.slice(0, 4000),
      plan: "",
    };
  }
  return fields;
}

export function parseSummaryContent(raw: string): SummaryContent {
  const jsonMatch = raw.match(/\{[\s\S]*?"body"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = asSummaryContent(JSON.parse(jsonMatch[0]));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }
  return { body: raw.slice(0, 8000) };
}

async function requireDoctorActor(
  actor: EmrActor,
): Promise<PlatformResult<{ userId: string; doctorId: string }>> {
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return platformFail("FORBIDDEN", "Doctor actor required");
  }
  return platformOk({ userId: actor.userId, doctorId: actor.doctorId });
}

async function assertDoctorCareAccess(
  actor: EmrActor,
  patientUserId: string,
  feature: "DOCTOR_SOAP" | "DOCTOR_SUMMARY",
): Promise<PlatformResult<{ allowed: true }>> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const related = await hasCareRelationship(doctor.data.doctorId, patientUserId);
  const access = assertAiFeatureAccess(actor.role, feature, {
    hasCareRelationship: related,
  });
  if (!access.allowed) {
    await aiAudit(
      "access.denied",
      { userId: actor.userId },
      { userId: patientUserId },
      "DENIED",
      { feature, reason: "care_relationship" },
    );
    return platformFail("NOT_FOUND", "Chart not found");
  }
  return platformOk({ allowed: true });
}

async function assertAppointmentOwned(
  doctorId: string,
  appointmentId: string,
  patientUserId: string,
): Promise<PlatformResult<{ id: string }>> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientUserId: true, doctorId: true },
  });
  if (!appointment || appointment.patientUserId !== patientUserId) {
    return platformFail("NOT_FOUND", "Appointment not found");
  }
  if (appointment.doctorId !== doctorId) {
    return platformFail("FORBIDDEN", "Doctor does not own this appointment");
  }
  return platformOk({ id: appointment.id });
}

/**
 * PENDING drafts are invisible to patients (FR-017).
 * Doctors may read their own drafts; patients only see ACCEPTED (post-accept EMR visibility).
 */
export async function getDraft(
  actor: EmrActor,
  draftId: string,
): Promise<PlatformResult<AiDraftArtifact>> {
  const draft = await prisma.aiDraftArtifact.findUnique({ where: { id: draftId } });
  if (!draft) return platformFail("NOT_FOUND", "Draft not found");

  if (actor.role === "PATIENT") {
    if (draft.patientUserId !== actor.userId || draft.status === "PENDING") {
      return platformFail("NOT_FOUND", "Draft not found");
    }
    return platformOk(draft);
  }

  if (actor.role === "DOCTOR") {
    if (draft.doctorUserId !== actor.userId) {
      return platformFail("NOT_FOUND", "Draft not found");
    }
    return platformOk(draft);
  }

  return platformFail("FORBIDDEN", "Unsupported role for drafts");
}

export async function generateSoapDraft(
  actor: EmrActor,
  input: {
    patientUserId: string;
    appointmentId: string;
    doctorInput?: string;
  },
): Promise<
  PlatformResult<{ draftId: string; content: SoapFields; evidence: DraftEvidence }>
> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const access = await assertDoctorCareAccess(actor, input.patientUserId, "DOCTOR_SOAP");
  if (!access.ok) return access;

  const appt = await assertAppointmentOwned(
    doctor.data.doctorId,
    input.appointmentId,
    input.patientUserId,
  );
  if (!appt.ok) return appt;

  const rate = checkAiRateLimit(actor.userId, "DOCTOR_SOAP");
  if (!rate.ok) return rate;

  const budget = await checkBudget("DOCTOR_SOAP");
  if (!budget.ok) {
    recordUsage({
      feature: "DOCTOR_SOAP",
      role: actor.role,
      locale: "en",
      userId: actor.userId,
      outcome: "BUDGET_BLOCKED",
    });
    return budget;
  }

  const started = Date.now();
  const promptText = [
    "Generate a structured SOAP clinical draft for clinician review.",
    "Respond with JSON only: {\"subjective\":\"\",\"objective\":\"\",\"assessment\":\"\",\"plan\":\"\"}.",
    "Never finalize or sign. Mark uncertainty explicitly.",
    input.doctorInput?.trim() ? `Clinician notes: ${input.doctorInput.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const gen = await generate({
    actor,
    patientUserId: input.patientUserId,
    feature: "DOCTOR_SOAP",
    locale: "en",
    conversationId: `draft-soap-${input.appointmentId}`,
    messages: [{ role: "user", content: promptText }],
    queryText: promptText,
  });

  if (!gen.ok) {
    recordUsage({
      feature: "DOCTOR_SOAP",
      role: actor.role,
      locale: "en",
      userId: actor.userId,
      outcome: "ERROR",
      latencyMs: Date.now() - started,
    });
    await aiAudit(
      "draft.generate",
      { userId: actor.userId },
      { userId: input.patientUserId },
      "FAILURE",
      { kind: "SOAP", appointmentId: input.appointmentId, code: gen.code },
    );
    return gen;
  }

  const content = parseSoapContent(gen.data.content, input.doctorInput);
  const evidence = toEvidence(gen.data.evidence);

  const draft = await prisma.aiDraftArtifact.create({
    data: {
      kind: "SOAP",
      doctorUserId: actor.userId,
      patientUserId: input.patientUserId,
      appointmentId: input.appointmentId,
      content: content as unknown as Prisma.InputJsonValue,
      evidence: evidence as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      promptVersionId: gen.data.promptVersionId,
      modelConfigId: gen.data.modelConfigId,
    },
  });

  recordUsage({
    feature: "DOCTOR_SOAP",
    role: actor.role,
    locale: "en",
    userId: actor.userId,
    modelConfigId: gen.data.modelConfigId,
    promptVersionId: gen.data.promptVersionId,
    promptTokens: gen.data.usage?.promptTokens,
    completionTokens: gen.data.usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: gen.data.refused ? "REFUSED" : "SUCCESS",
    modelName: gen.data.modelName,
  });

  await aiAudit(
    "draft.generate",
    { userId: actor.userId },
    { userId: input.patientUserId },
    "SUCCESS",
    { draftId: draft.id, kind: "SOAP", appointmentId: input.appointmentId },
  );

  return platformOk({ draftId: draft.id, content, evidence });
}

export async function generateConsultationSummary(
  actor: EmrActor,
  input: {
    patientUserId: string;
    appointmentId: string;
    /** Ignored when patient preference is available — server resolves patient locale (FR-019). */
    locale?: "en" | "ar";
  },
): Promise<
  PlatformResult<{ draftId: string; content: SummaryContent; evidence: DraftEvidence }>
> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const access = await assertDoctorCareAccess(actor, input.patientUserId, "DOCTOR_SUMMARY");
  if (!access.ok) return access;

  const appt = await assertAppointmentOwned(
    doctor.data.doctorId,
    input.appointmentId,
    input.patientUserId,
  );
  if (!appt.ok) return appt;

  const rate = checkAiRateLimit(actor.userId, "DOCTOR_SUMMARY");
  if (!rate.ok) return rate;

  // Prefer patient localePreference / portalSettings over doctor UI locale
  const locale = await resolveLocaleForUser(input.patientUserId);

  const budget = await checkBudget("DOCTOR_SUMMARY");
  if (!budget.ok) {
    recordUsage({
      feature: "DOCTOR_SUMMARY",
      role: actor.role,
      locale,
      userId: actor.userId,
      outcome: "BUDGET_BLOCKED",
    });
    return budget;
  }

  const started = Date.now();
  const lang = locale === "ar" ? "Arabic" : "English";
  const promptText = [
    `Draft a patient-facing consultation summary in ${lang}.`,
    'Respond with JSON only: {"body":"..."}.',
    "Do not finalize or release to the patient. Clinician must review.",
  ].join("\n");

  const gen = await generate({
    actor,
    patientUserId: input.patientUserId,
    feature: "DOCTOR_SUMMARY",
    locale,
    conversationId: `draft-summary-${input.appointmentId}`,
    messages: [{ role: "user", content: promptText }],
    queryText: promptText,
  });

  if (!gen.ok) {
    recordUsage({
      feature: "DOCTOR_SUMMARY",
      role: actor.role,
      locale,
      userId: actor.userId,
      outcome: "ERROR",
      latencyMs: Date.now() - started,
    });
    await aiAudit(
      "draft.generate",
      { userId: actor.userId },
      { userId: input.patientUserId },
      "FAILURE",
      { kind: "CONSULT_SUMMARY", appointmentId: input.appointmentId, code: gen.code },
    );
    return gen;
  }

  const content = parseSummaryContent(gen.data.content);
  const evidence = toEvidence(gen.data.evidence);

  const draft = await prisma.aiDraftArtifact.create({
    data: {
      kind: "CONSULT_SUMMARY",
      doctorUserId: actor.userId,
      patientUserId: input.patientUserId,
      appointmentId: input.appointmentId,
      content: content as unknown as Prisma.InputJsonValue,
      evidence: evidence as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      promptVersionId: gen.data.promptVersionId,
      modelConfigId: gen.data.modelConfigId,
    },
  });

  recordUsage({
    feature: "DOCTOR_SUMMARY",
    role: actor.role,
    locale,
    userId: actor.userId,
    modelConfigId: gen.data.modelConfigId,
    promptVersionId: gen.data.promptVersionId,
    promptTokens: gen.data.usage?.promptTokens,
    completionTokens: gen.data.usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: gen.data.refused ? "REFUSED" : "SUCCESS",
    modelName: gen.data.modelName,
  });

  await aiAudit(
    "draft.generate",
    { userId: actor.userId },
    { userId: input.patientUserId },
    "SUCCESS",
    { draftId: draft.id, kind: "CONSULT_SUMMARY", appointmentId: input.appointmentId },
  );

  return platformOk({ draftId: draft.id, content, evidence });
}

function mergeSoapEdits(base: SoapFields, edits?: Partial<SoapFields>): SoapFields {
  if (!edits) return base;
  return {
    subjective: edits.subjective ?? base.subjective,
    objective: edits.objective ?? base.objective,
    assessment: edits.assessment ?? base.assessment,
    plan: edits.plan ?? base.plan,
  };
}

/**
 * Accept a PENDING AI draft into the EMR draft flow (FR-017/018/045).
 * AI never signs — signing stays exclusively in EMR note facades.
 */
export async function acceptDraft(
  actor: EmrActor,
  input: {
    draftId: string;
    edits?: Partial<SoapFields> & { body?: string } & Partial<RxFields>;
  },
): Promise<PlatformResult<{ draftId: string; acceptedIntoId: string }>> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const draft = await prisma.aiDraftArtifact.findUnique({ where: { id: input.draftId } });
  if (!draft || draft.doctorUserId !== actor.userId) {
    return platformFail("NOT_FOUND", "Draft not found");
  }
  if (draft.status !== "PENDING") {
    return platformFail("CONFLICT", "Draft is not pending");
  }

  if (draft.kind === "RX_SUGGESTION") {
    return acceptRxDraft(actor, {
      draftId: input.draftId,
      edits:
        input.edits?.lines || input.edits?.instructions !== undefined
          ? {
              lines: input.edits.lines,
              instructions: input.edits.instructions,
            }
          : undefined,
    });
  }

  if (!draft.appointmentId) {
    return platformFail("VALIDATION_ERROR", "Draft has no appointment context");
  }

  const access = await assertDoctorCareAccess(
    actor,
    draft.patientUserId,
    draft.kind === "CONSULT_SUMMARY" ? "DOCTOR_SUMMARY" : "DOCTOR_SOAP",
  );
  if (!access.ok) return access;

  let acceptedIntoId: string;

  if (draft.kind === "SOAP") {
    const base = asSoapFields(draft.content);
    if (!base) return platformFail("INTERNAL_FAILURE", "Invalid SOAP draft content");
    const content = mergeSoapEdits(base, input.edits);
    const saved = await saveSoapDraft(actor, {
      appointmentId: draft.appointmentId,
      subjective: content.subjective,
      objective: content.objective,
      assessment: content.assessment,
      plan: content.plan,
      aiAssisted: true,
    });
    if (!saved.ok) return saved;
    acceptedIntoId = saved.data.noteId;
  } else if (draft.kind === "CONSULT_SUMMARY") {
    const base = asSummaryContent(draft.content);
    if (!base) return platformFail("INTERNAL_FAILURE", "Invalid summary draft content");
    const body = input.edits?.body ?? base.body;
    const saved = await saveSummaryDraft(actor, {
      appointmentId: draft.appointmentId,
      body,
      aiAssisted: true,
    });
    if (!saved.ok) return saved;
    acceptedIntoId = saved.data.summaryId;
  } else {
    return platformFail("VALIDATION_ERROR", "Unsupported draft kind");
  }

  const updated = await prisma.aiDraftArtifact.update({
    where: { id: draft.id },
    data: {
      status: "ACCEPTED",
      acceptedIntoId,
      content:
        draft.kind === "SOAP"
          ? (mergeSoapEdits(asSoapFields(draft.content)!, input.edits) as unknown as Prisma.InputJsonValue)
          : ({ body: input.edits?.body ?? (asSummaryContent(draft.content)?.body ?? "") } as unknown as Prisma.InputJsonValue),
    },
  });

  await aiAudit(
    "draft.accept",
    { userId: actor.userId },
    { userId: draft.patientUserId },
    "SUCCESS",
    {
      draftId: updated.id,
      kind: draft.kind as AiDraftKind,
      acceptedIntoId,
    },
  );

  return platformOk({ draftId: updated.id, acceptedIntoId });
}

export async function discardDraft(
  actor: EmrActor,
  input: { draftId: string },
): Promise<PlatformResult<{ draftId: string }>> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const draft = await prisma.aiDraftArtifact.findUnique({ where: { id: input.draftId } });
  if (!draft || draft.doctorUserId !== actor.userId) {
    return platformFail("NOT_FOUND", "Draft not found");
  }
  if (draft.status !== "PENDING") {
    return platformFail("CONFLICT", "Draft is not pending");
  }

  await prisma.aiDraftArtifact.update({
    where: { id: draft.id },
    data: { status: "DISCARDED" },
  });

  await aiAudit(
    "draft.discard",
    { userId: actor.userId },
    { userId: draft.patientUserId },
    "SUCCESS",
    { draftId: draft.id, kind: draft.kind },
  );

  return platformOk({ draftId: draft.id });
}
