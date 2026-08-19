import type {
  AiSymptomOutcome,
  AiSymptomSession,
  AiSymptomSessionStatus,
  LocaleCode,
  Prisma,
} from "@prisma/client";
import type { AiActor } from "@/actions/ai/_actor";
import { canAccessAiFeature } from "@/domain/ai/access";
import { scanRedFlags, type RedFlagCategory } from "@/domain/ai/red-flags";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";
import { checkBudget } from "./budgets";
import { requireFeatureAi } from "./governance-gate";
import { recordGuardrailEventAsync } from "./guardrail-events";
import { recordUsage } from "./metering";
import { generate } from "./orchestration";
import { checkAiRateLimit } from "./rate-limit";
import { redFlagNoticeText } from "./conversations";

export const MAX_CLARIFYING_STEPS = 4;

export type SymptomOutcomeKind = AiSymptomOutcome;

export type SymptomStep = {
  question: string;
  answer: string | null;
  at: string;
};

export type SymptomOutcomeDto = {
  kind: SymptomOutcomeKind;
  rationale: string;
  disclaimer: string;
};

export type SymptomSessionDto = {
  id: string;
  locale: "en" | "ar";
  status: AiSymptomSessionStatus;
  steps: SymptomStep[];
  outcome: SymptomOutcomeKind | null;
  rationale: string | null;
  redFlagged: boolean;
  appointmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

const OUTCOME_RANK: Record<SymptomOutcomeKind, number> = {
  SELF_CARE: 0,
  SEE_DOCTOR: 1,
  URGENT: 2,
  EMERGENCY: 3,
};

const OUTCOME_KINDS = new Set<string>([
  "SELF_CARE",
  "SEE_DOCTOR",
  "URGENT",
  "EMERGENCY",
]);

function toEmrActor(actor: AiActor): EmrActor {
  return {
    userId: actor.userId,
    role: actor.role,
    doctorId: actor.doctorId ?? null,
  };
}

function toLocaleCode(locale: "en" | "ar" | LocaleCode): LocaleCode {
  if (locale === "en" || locale === "EN") return "EN";
  return "AR";
}

function toPortLocale(locale: LocaleCode | "en" | "ar"): "en" | "ar" {
  return locale === "AR" || locale === "ar" ? "ar" : "en";
}

export function nonDiagnosticDisclaimer(locale: "en" | "ar"): string {
  return locale === "ar"
    ? "هذا التوجيه ليس تشخيصاً طبياً ولا يغني عن استشارة مختص رعاية صحية مرخّص."
    : "This guidance is not a medical diagnosis and does not replace care from a licensed clinician.";
}

export function outcomeRank(kind: SymptomOutcomeKind): number {
  return OUTCOME_RANK[kind];
}

/**
 * Escalate-only rule (research R9 / FR-011):
 * A deterministic red-flag may raise the outcome to EMERGENCY, never lower
 * an LLM-proposed (or prior) classification.
 */
export function applyEscalateOnly(
  proposed: SymptomOutcomeKind,
  redFlagTriggered: boolean,
): SymptomOutcomeKind {
  if (!redFlagTriggered) return proposed;
  return outcomeRank(proposed) >= outcomeRank("EMERGENCY") ? proposed : "EMERGENCY";
}

/** Take the higher-severity of two outcomes (escalate-only merge). */
export function maxOutcome(
  a: SymptomOutcomeKind,
  b: SymptomOutcomeKind,
): SymptomOutcomeKind {
  return outcomeRank(a) >= outcomeRank(b) ? a : b;
}

export function parseSteps(raw: unknown): SymptomStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: SymptomStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.question !== "string") continue;
    steps.push({
      question: o.question,
      answer: typeof o.answer === "string" ? o.answer : o.answer === null ? null : null,
      at: typeof o.at === "string" ? o.at : new Date().toISOString(),
    });
  }
  return steps;
}

function intakeQuestion(locale: "en" | "ar"): string {
  return locale === "ar" ? "ما هي الأعراض التي تشعر بها؟" : "What symptoms are you experiencing?";
}

function defaultClarifyingQuestion(locale: "en" | "ar", stepIndex: number): string {
  if (locale === "ar") {
    const qs = [
      "منذ متى بدأت هذه الأعراض؟",
      "هل توجد أعراض أخرى مصاحبة؟",
      "هل جربت أي علاج منزلي؟",
      "ما مدى شدة الأعراض من 1 إلى 10؟",
    ];
    return qs[Math.min(stepIndex, qs.length - 1)]!;
  }
  const qs = [
    "How long have you had these symptoms?",
    "Are there any other accompanying symptoms?",
    "Have you tried any home remedies?",
    "On a scale of 1–10, how severe are the symptoms?",
  ];
  return qs[Math.min(stepIndex, qs.length - 1)]!;
}

function defaultMildOutcome(locale: "en" | "ar"): SymptomOutcomeDto {
  return {
    kind: "SELF_CARE",
    rationale:
      locale === "ar"
        ? "بناءً على ما وصفته، قد تساعد الراحة والرعاية الذاتية العامة. راقب الأعراض واطلب استشارة إذا ساءت."
        : "Based on what you described, rest and general self-care may help. Monitor symptoms and seek care if they worsen.",
    disclaimer: nonDiagnosticDisclaimer(locale),
  };
}

function emergencyOutcomeDto(
  locale: "en" | "ar",
  category?: RedFlagCategory,
): SymptomOutcomeDto {
  return {
    kind: "EMERGENCY",
    rationale: redFlagNoticeText(locale, category),
    disclaimer: nonDiagnosticDisclaimer(locale),
  };
}

function parseOutcomeKind(raw: unknown): SymptomOutcomeKind | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (OUTCOME_KINDS.has(normalized)) return normalized as SymptomOutcomeKind;
  return null;
}

type LlmProposal =
  | { type: "question"; question: string }
  | { type: "outcome"; kind: SymptomOutcomeKind; rationale: string };

/**
 * Parse LLM JSON proposal for next clarifying question or final outcome.
 * Falls back to heuristic defaults when the model returns free text.
 */
export function parseLlmProposal(
  content: string,
  locale: "en" | "ar",
  forceOutcome: boolean,
): LlmProposal {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const type = typeof parsed.type === "string" ? parsed.type.toLowerCase() : "";
      if (type === "outcome" || parsed.kind) {
        const kind = parseOutcomeKind(parsed.kind) ?? "SEE_DOCTOR";
        const rationale =
          typeof parsed.rationale === "string" && parsed.rationale.trim()
            ? parsed.rationale.trim()
            : defaultMildOutcome(locale).rationale;
        return { type: "outcome", kind, rationale };
      }
      if (type === "question" || parsed.question) {
        const question =
          typeof parsed.question === "string" && parsed.question.trim()
            ? parsed.question.trim()
            : defaultClarifyingQuestion(locale, 0);
        if (forceOutcome) {
          return {
            type: "outcome",
            kind: "SEE_DOCTOR",
            rationale: defaultMildOutcome(locale).rationale,
          };
        }
        return { type: "question", question };
      }
    } catch {
      /* fall through */
    }
  }

  if (forceOutcome) {
    return {
      type: "outcome",
      kind: "SEE_DOCTOR",
      rationale: content.trim().slice(0, 2000) || defaultMildOutcome(locale).rationale,
    };
  }

  const line = content
    .split("\n")
    .map((l) => l.replace(/^\[Stub\]\s*/i, "").trim())
    .find((l) => l.length > 8 && !l.toLowerCase().includes("disclaimer"));
  return {
    type: "question",
    question: line?.slice(0, 400) || defaultClarifyingQuestion(locale, 0),
  };
}

function toSessionDto(row: AiSymptomSession): SymptomSessionDto {
  return {
    id: row.id,
    locale: toPortLocale(row.locale),
    status: row.status,
    steps: parseSteps(row.steps),
    outcome: row.outcome,
    rationale: row.rationale,
    redFlagged: row.redFlagged,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function assertPatientAccess(actor: AiActor): PlatformResult<{ allowed: true }> {
  if (actor.role !== "PATIENT") {
    return platformFail("FORBIDDEN", "Symptom checker is patient-only");
  }
  if (!canAccessAiFeature(actor.role, "SYMPTOM_CHECKER")) {
    return platformFail("FORBIDDEN", "AI feature not allowed for role");
  }
  return platformOk({ allowed: true });
}

function assertSessionOwner(
  actor: AiActor,
  session: { patientUserId: string } | null,
): PlatformResult<{ allowed: true }> {
  if (!session) return platformFail("NOT_FOUND", "Session not found");
  if (actor.role !== "PATIENT" || actor.userId !== session.patientUserId) {
    return platformFail("FORBIDDEN", "Session access denied");
  }
  return platformOk({ allowed: true });
}

function buildTranscriptPrompt(steps: SymptomStep[], locale: "en" | "ar"): string {
  const lines = steps.map((s, i) => {
    const ans = s.answer?.trim() ? s.answer : "(pending)";
    return `Q${i + 1}: ${s.question}\nA${i + 1}: ${ans}`;
  });
  const instruction =
    locale === "ar"
      ? "أجب JSON فقط: إما {\"type\":\"question\",\"question\":\"...\"} لسؤال توضيحي واحد، أو {\"type\":\"outcome\",\"kind\":\"SELF_CARE|SEE_DOCTOR|URGENT|EMERGENCY\",\"rationale\":\"...\"}. لا تقدّم تشخيصاً."
      : 'Respond with JSON only: either {"type":"question","question":"..."} for one clarifying question, or {"type":"outcome","kind":"SELF_CARE|SEE_DOCTOR|URGENT|EMERGENCY","rationale":"..."}. Never give a definitive diagnosis.';
  return `${instruction}\n\nSession so far:\n${lines.join("\n")}`;
}

async function proposeNext(
  actor: AiActor,
  sessionId: string,
  locale: "en" | "ar",
  steps: SymptomStep[],
  forceOutcome: boolean,
): Promise<
  PlatformResult<{
    proposal: LlmProposal;
    promptVersionId: string;
    modelConfigId: string;
    modelName: string;
    usage?: { promptTokens: number; completionTokens: number };
  }>
> {
  const prompt = buildTranscriptPrompt(steps, locale);
  if (forceOutcome) {
    const forceNote =
      locale === "ar"
        ? "يجب إرجاع نتيجة نهائية الآن (type=outcome)."
        : "You must return a final outcome now (type=outcome).";
    const gen = await generate({
      actor: toEmrActor(actor),
      patientUserId: actor.userId,
      feature: "SYMPTOM_CHECKER",
      locale,
      conversationId: sessionId,
      messages: [{ role: "user", content: `${forceNote}\n\n${prompt}` }],
      queryText: steps.map((s) => s.answer).filter(Boolean).join(" "),
    });
    if (!gen.ok) return gen;
    return platformOk({
      proposal: parseLlmProposal(gen.data.content, locale, true),
      promptVersionId: gen.data.promptVersionId,
      modelConfigId: gen.data.modelConfigId,
      modelName: gen.data.modelName,
      usage: gen.data.usage,
    });
  }

  const gen = await generate({
    actor: toEmrActor(actor),
    patientUserId: actor.userId,
    feature: "SYMPTOM_CHECKER",
    locale,
    conversationId: sessionId,
    messages: [{ role: "user", content: prompt }],
    queryText: steps.map((s) => s.answer).filter(Boolean).join(" "),
  });
  if (!gen.ok) return gen;
  return platformOk({
    proposal: parseLlmProposal(gen.data.content, locale, false),
    promptVersionId: gen.data.promptVersionId,
    modelConfigId: gen.data.modelConfigId,
    modelName: gen.data.modelName,
    usage: gen.data.usage,
  });
}

async function completeSession(
  sessionId: string,
  outcome: SymptomOutcomeDto,
  redFlagged: boolean,
): Promise<AiSymptomSession> {
  return prisma.aiSymptomSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      outcome: outcome.kind,
      rationale: outcome.rationale,
      redFlagged,
    },
  });
}

export type StartSymptomResult =
  | { sessionId: string; nextQuestion: string; outcome?: undefined }
  | { sessionId: string; nextQuestion?: undefined; outcome: SymptomOutcomeDto };

/**
 * Create a symptom session from free-text complaint. Red-flag on intake
 * completes immediately with EMERGENCY (FR-011).
 */
export async function startSymptomSession(
  actor: AiActor,
  input: { locale: "en" | "ar"; complaint: string },
): Promise<PlatformResult<StartSymptomResult>> {
  const access = assertPatientAccess(actor);
  if (!access.ok) return access;

  const complaint = input.complaint.trim();
  if (!complaint || complaint.length > 4000) {
    return platformFail("VALIDATION_ERROR", "Complaint must be 1–4000 characters");
  }

  const rate = checkAiRateLimit(actor.userId, "SYMPTOM_CHECKER");
  if (!rate.ok) return rate;

  const allowed = await requireFeatureAi(actor.userId, "SYMPTOM_CHECKER");
  if (!allowed.ok) return allowed;

  const budget = await checkBudget("SYMPTOM_CHECKER");
  if (!budget.ok) return budget;

  const locale = input.locale;
  const started = Date.now();
  const now = new Date().toISOString();
  const steps: SymptomStep[] = [
    { question: intakeQuestion(locale), answer: complaint, at: now },
  ];

  const session = await prisma.aiSymptomSession.create({
    data: {
      patientUserId: actor.userId,
      locale: toLocaleCode(locale),
      status: "IN_PROGRESS",
      steps: steps as unknown as Prisma.InputJsonValue,
      redFlagged: false,
    },
  });

  const red = scanRedFlags(complaint);
  if (red.triggered) {
    recordGuardrailEventAsync({
      trigger: "RED_FLAG",
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      category: red.category ?? "red_flag",
      actorUserId: actor.userId,
    });
    const outcome = emergencyOutcomeDto(locale, red.category);
    await completeSession(session.id, outcome, true);
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "RED_FLAG",
    });
    await aiAudit(
      "symptom.start",
      { userId: actor.userId },
      { userId: actor.userId },
      "SUCCESS",
      { sessionId: session.id, redFlagged: true, outcome: outcome.kind },
    );
    return platformOk({ sessionId: session.id, outcome });
  }

  const proposal = await proposeNext(actor, session.id, locale, steps, false);
  if (!proposal.ok) {
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "ERROR",
    });
    return proposal;
  }

  if (proposal.data.proposal.type === "outcome") {
    const kind = applyEscalateOnly(proposal.data.proposal.kind, false);
    const outcome: SymptomOutcomeDto = {
      kind,
      rationale: proposal.data.proposal.rationale,
      disclaimer: nonDiagnosticDisclaimer(locale),
    };
    await completeSession(session.id, outcome, false);
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      promptVersionId: proposal.data.promptVersionId,
      modelConfigId: proposal.data.modelConfigId,
      modelName: proposal.data.modelName,
      promptTokens: proposal.data.usage?.promptTokens,
      completionTokens: proposal.data.usage?.completionTokens,
      latencyMs: Date.now() - started,
      outcome: "SUCCESS",
    });
    await aiAudit(
      "symptom.start",
      { userId: actor.userId },
      { userId: actor.userId },
      "SUCCESS",
      { sessionId: session.id, outcome: outcome.kind },
    );
    return platformOk({ sessionId: session.id, outcome });
  }

  const nextQuestion = proposal.data.proposal.question;
  const nextSteps: SymptomStep[] = [
    ...steps,
    { question: nextQuestion, answer: null, at: new Date().toISOString() },
  ];
  await prisma.aiSymptomSession.update({
    where: { id: session.id },
    data: { steps: nextSteps as unknown as Prisma.InputJsonValue },
  });

  recordUsage({
    feature: "SYMPTOM_CHECKER",
    role: actor.role,
    locale,
    userId: actor.userId,
    promptVersionId: proposal.data.promptVersionId,
    modelConfigId: proposal.data.modelConfigId,
    modelName: proposal.data.modelName,
    promptTokens: proposal.data.usage?.promptTokens,
    completionTokens: proposal.data.usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: "SUCCESS",
  });
  await aiAudit(
    "symptom.start",
    { userId: actor.userId },
    { userId: actor.userId },
    "SUCCESS",
    { sessionId: session.id },
  );

  return platformOk({ sessionId: session.id, nextQuestion });
}

export type AnswerSymptomResult =
  | { nextQuestion: string; outcome?: undefined }
  | { nextQuestion?: undefined; outcome: SymptomOutcomeDto };

/**
 * Record an answer for the current open step; may return another question
 * or a final escalate-only-validated outcome.
 */
export async function answerSymptomStep(
  actor: AiActor,
  input: { sessionId: string; answer: string },
): Promise<PlatformResult<AnswerSymptomResult>> {
  const access = assertPatientAccess(actor);
  if (!access.ok) return access;

  const allowed = await requireFeatureAi(actor.userId, "SYMPTOM_CHECKER");
  if (!allowed.ok) return allowed;

  const answer = input.answer.trim();
  if (!answer || answer.length > 4000) {
    return platformFail("VALIDATION_ERROR", "Answer must be 1–4000 characters");
  }

  const session = await prisma.aiSymptomSession.findUnique({
    where: { id: input.sessionId },
  });
  const owned = assertSessionOwner(actor, session);
  if (!owned.ok) return owned;
  if (!session) return platformFail("NOT_FOUND", "Session not found");
  if (session.status !== "IN_PROGRESS") {
    return platformFail("VALIDATION_ERROR", "Session is not in progress");
  }

  const locale = toPortLocale(session.locale);
  const started = Date.now();
  const steps = parseSteps(session.steps);
  const openIdx = steps.findIndex((s) => s.answer === null);
  if (openIdx >= 0) {
    steps[openIdx] = { ...steps[openIdx]!, answer, at: new Date().toISOString() };
  } else {
    steps.push({
      question: defaultClarifyingQuestion(locale, steps.length),
      answer,
      at: new Date().toISOString(),
    });
  }

  await prisma.aiSymptomSession.update({
    where: { id: session.id },
    data: { steps: steps as unknown as Prisma.InputJsonValue },
  });

  const red = scanRedFlags(answer);
  if (red.triggered || session.redFlagged) {
    recordGuardrailEventAsync({
      trigger: "RED_FLAG",
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      category: red.category ?? "red_flag",
      actorUserId: actor.userId,
    });
    // Even if an LLM would later propose SELF_CARE, escalate-only forces EMERGENCY.
    const proposed: SymptomOutcomeKind = "SELF_CARE";
    const kind = applyEscalateOnly(proposed, true);
    const outcome: SymptomOutcomeDto = {
      kind,
      rationale: emergencyOutcomeDto(locale, red.category).rationale,
      disclaimer: nonDiagnosticDisclaimer(locale),
    };
    await completeSession(session.id, outcome, true);
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "RED_FLAG",
    });
    await aiAudit(
      "symptom.answer",
      { userId: actor.userId },
      { userId: actor.userId },
      "SUCCESS",
      { sessionId: session.id, redFlagged: true, outcome: kind },
    );
    return platformOk({ outcome });
  }

  const answeredCount = steps.filter((s) => s.answer !== null).length;
  const forceOutcome = answeredCount >= MAX_CLARIFYING_STEPS + 1; // intake + clarifying

  const proposal = await proposeNext(actor, session.id, locale, steps, forceOutcome);
  if (!proposal.ok) {
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "ERROR",
    });
    return proposal;
  }

  if (proposal.data.proposal.type === "outcome") {
    const kind = applyEscalateOnly(proposal.data.proposal.kind, false);
    const outcome: SymptomOutcomeDto = {
      kind,
      rationale: proposal.data.proposal.rationale,
      disclaimer: nonDiagnosticDisclaimer(locale),
    };
    await completeSession(session.id, outcome, false);
    recordUsage({
      feature: "SYMPTOM_CHECKER",
      role: actor.role,
      locale,
      userId: actor.userId,
      promptVersionId: proposal.data.promptVersionId,
      modelConfigId: proposal.data.modelConfigId,
      modelName: proposal.data.modelName,
      promptTokens: proposal.data.usage?.promptTokens,
      completionTokens: proposal.data.usage?.completionTokens,
      latencyMs: Date.now() - started,
      outcome: "SUCCESS",
    });
    await aiAudit(
      "symptom.answer",
      { userId: actor.userId },
      { userId: actor.userId },
      "SUCCESS",
      { sessionId: session.id, outcome: kind },
    );
    return platformOk({ outcome });
  }

  const nextQuestion = proposal.data.proposal.question;
  const nextSteps: SymptomStep[] = [
    ...steps,
    { question: nextQuestion, answer: null, at: new Date().toISOString() },
  ];
  await prisma.aiSymptomSession.update({
    where: { id: session.id },
    data: { steps: nextSteps as unknown as Prisma.InputJsonValue },
  });

  recordUsage({
    feature: "SYMPTOM_CHECKER",
    role: actor.role,
    locale,
    userId: actor.userId,
    promptVersionId: proposal.data.promptVersionId,
    modelConfigId: proposal.data.modelConfigId,
    modelName: proposal.data.modelName,
    promptTokens: proposal.data.usage?.promptTokens,
    completionTokens: proposal.data.usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: "SUCCESS",
  });
  await aiAudit(
    "symptom.answer",
    { userId: actor.userId },
    { userId: actor.userId },
    "SUCCESS",
    { sessionId: session.id },
  );

  return platformOk({ nextQuestion });
}

export async function getSymptomSession(
  actor: AiActor,
  input: { sessionId: string },
): Promise<PlatformResult<{ session: SymptomSessionDto }>> {
  const access = assertPatientAccess(actor);
  if (!access.ok) return access;

  const session = await prisma.aiSymptomSession.findUnique({
    where: { id: input.sessionId },
  });
  const owned = assertSessionOwner(actor, session);
  if (!owned.ok) return owned;
  if (!session) return platformFail("NOT_FOUND", "Session not found");

  return platformOk({ session: toSessionDto(session) });
}

/** Owner-scoped symptom session history, newest first (FR-012). */
export async function listSymptomSessions(
  actor: AiActor,
  input: { page?: number } = {},
): Promise<PlatformResult<{ items: SymptomSessionDto[]; total: number }>> {
  const access = assertPatientAccess(actor);
  if (!access.ok) return access;

  const page = Math.max(1, input.page ?? 1);
  const pageSize = 20;
  const where = { patientUserId: actor.userId };

  const [total, rows] = await Promise.all([
    prisma.aiSymptomSession.count({ where }),
    prisma.aiSymptomSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return platformOk({
    items: rows.map(toSessionDto),
    total,
  });
}

/**
 * Attach a completed session to the patient's own appointment (FR-012).
 */
export async function attachSessionToBooking(
  actor: AiActor,
  input: { sessionId: string; appointmentId: string },
): Promise<PlatformResult<{ sessionId: string }>> {
  const access = assertPatientAccess(actor);
  if (!access.ok) return access;

  const session = await prisma.aiSymptomSession.findUnique({
    where: { id: input.sessionId },
  });
  const owned = assertSessionOwner(actor, session);
  if (!owned.ok) return owned;
  if (!session) return platformFail("NOT_FOUND", "Session not found");
  if (session.status !== "COMPLETED") {
    return platformFail("VALIDATION_ERROR", "Only completed sessions can be attached");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, patientUserId: true },
  });
  if (!appointment || appointment.patientUserId !== actor.userId) {
    return platformFail("FORBIDDEN", "Appointment not owned by patient");
  }

  await prisma.aiSymptomSession.update({
    where: { id: session.id },
    data: { appointmentId: appointment.id },
  });

  await aiAudit(
    "symptom.attach",
    { userId: actor.userId },
    { userId: actor.userId },
    "SUCCESS",
    { sessionId: session.id, appointmentId: appointment.id },
  );

  return platformOk({ sessionId: session.id });
}

/** Doctor-facing helper: load attached session summary for an appointment. */
export async function getAttachedSymptomSummary(appointmentId: string): Promise<{
  outcome: SymptomOutcomeKind | null;
  rationale: string | null;
  redFlagged: boolean;
  createdAt: string;
} | null> {
  const row = await prisma.aiSymptomSession.findFirst({
    where: { appointmentId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: {
      outcome: true,
      rationale: true,
      redFlagged: true,
      createdAt: true,
    },
  });
  if (!row) return null;
  return {
    outcome: row.outcome,
    rationale: row.rationale,
    redFlagged: row.redFlagged,
    createdAt: row.createdAt.toISOString(),
  };
}
