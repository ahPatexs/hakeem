import type { AiDraftKind, Prisma } from "@prisma/client";
import { assertAiFeatureAccess } from "@/domain/ai/access";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import type { AiChartContext } from "@/lib/emr/ai-context";
import { buildAiChartContext } from "@/lib/emr/ai-context";
import { savePrescriptionDraft } from "@/lib/emr/prescriptions";
import { runSafetyCheck } from "@/lib/platform/safety";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";
import { checkBudget } from "./budgets";
import type { DraftEvidence } from "./drafts";
import { recordUsage } from "./metering";
import { generate } from "./orchestration";
import { checkAiRateLimit } from "./rate-limit";

export type RxLineFields = {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
};

export type RxFields = {
  lines: RxLineFields[];
  instructions?: string;
};

export type RxConflict = {
  kind: "ALLERGY" | "INTERACTION";
  detail: string;
  evidence: string;
};

export type CdsInsightDto = {
  id: string;
  title: string;
  body: string;
  kind: "ALLERGY" | "INTERACTION" | "HISTORY" | "CARE_GAP";
  evidence: string;
  chartCategories: string[];
};

export type SuggestPrescriptionSuccess =
  | {
      noSafeSuggestion: false;
      draftId: string;
      content: RxFields;
      evidence: DraftEvidence;
      conflicts: RxConflict[];
    }
  | {
      noSafeSuggestion: true;
      reason: string;
      evidence: DraftEvidence;
      conflicts: RxConflict[];
    };

/** Process-local CDS dismissals: doctorUserId → patientUserId → insightId set. */
const cdsDismissals = new Map<string, Map<string, Set<string>>>();

/** Test helper — clears in-memory CDS dismissals. */
export function __resetCdsDismissalsForTests(): void {
  cdsDismissals.clear();
}

const UNCERTAIN_INTENT =
  /^(?:\?+|…|\.{2,}|idk|i\s*don'?t\s*know|unsure|unknown|n\/?a|none|nothing|تأكد|غير\s*واضح|لا\s*أعلم)$/i;

const KNOWN_INTERACTION_PAIRS: Array<[string, string]> = [
  ["warfarin", "ibuprofen"],
  ["warfarin", "aspirin"],
  ["warfarin", "naproxen"],
  ["methotrexate", "ibuprofen"],
  ["ssri", "tramadol"],
  ["sertraline", "tramadol"],
  ["fluoxetine", "tramadol"],
];

function toEvidence(raw: {
  chartCategories: string[];
  kbSources: Array<{ title: string }>;
}): DraftEvidence {
  return {
    chartCategories: raw.chartCategories,
    kbSources: raw.kbSources.map((s) => s.title),
  };
}

async function requireDoctorActor(
  actor: EmrActor,
): Promise<PlatformResult<{ userId: string; doctorId: string }>> {
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return platformFail("FORBIDDEN", "Doctor actor required");
  }
  return platformOk({ userId: actor.userId, doctorId: actor.doctorId });
}

async function assertDoctorFeatureAccess(
  actor: EmrActor,
  patientUserId: string,
  feature: "RX_ASSIST" | "CDS",
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
      { feature, reason: related ? "role" : "care_relationship" },
    );
    return platformFail("FORBIDDEN", "Care relationship required");
  }
  return platformOk({ allowed: true });
}

export function isUncertainRxIntent(intent: string): boolean {
  const trimmed = intent.trim();
  if (trimmed.length < 3) return true;
  return UNCERTAIN_INTENT.test(trimmed);
}

/** Deterministic Rx fields from clinician intent when the model does not return JSON. */
export function resolveRxFromIntent(intent: string): RxFields | null {
  if (isUncertainRxIntent(intent)) return null;

  const lower = intent.toLowerCase();

  if (
    /\b(antibiotic|infection|bacterial|penicillin|amoxicillin|strep|cellulitis|uti)\b/i.test(
      lower,
    ) || /مضاد حيوي|التهاب|عدوى/.test(intent)
  ) {
    return {
      lines: [
        {
          medicationName: "Amoxicillin",
          dose: "500 mg",
          route: "PO",
          frequency: "TID",
          duration: "7 days",
          instructions: "Take with food. Complete the full course.",
        },
      ],
      instructions: "Review allergies before signing.",
    };
  }

  if (/\b(pain|analgesia|analgesic|nsaid|ibuprofen|headache|toothache)\b/i.test(lower) || /ألم|مسكن/.test(intent)) {
    return {
      lines: [
        {
          medicationName: "Ibuprofen",
          dose: "400 mg",
          route: "PO",
          frequency: "TID PRN",
          duration: "5 days",
          instructions: "Take with food. Max 1200 mg/day OTC.",
        },
      ],
    };
  }

  if (/\b(fever|paracetamol|acetaminophen|tylenol)\b/i.test(lower) || /حمى|باراسيتامول/.test(intent)) {
    return {
      lines: [
        {
          medicationName: "Paracetamol",
          dose: "500 mg",
          route: "PO",
          frequency: "QID PRN",
          duration: "3 days",
          instructions: "Do not exceed 4 g/day.",
        },
      ],
    };
  }

  // Honest fallback: intent is non-empty but not mapped — no safe generic guess.
  return null;
}

export function parseRxContent(raw: string): RxFields | null {
  const jsonMatch = raw.match(/\{[\s\S]*?"(?:lines|medicationName)"[\s\S]*?\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (Array.isArray(parsed.lines)) {
      const lines = parsed.lines
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          medicationName: String(l.medicationName ?? "").trim(),
          dose: l.dose != null ? String(l.dose) : undefined,
          route: l.route != null ? String(l.route) : undefined,
          frequency: l.frequency != null ? String(l.frequency) : undefined,
          duration: l.duration != null ? String(l.duration) : undefined,
          quantity: l.quantity != null ? String(l.quantity) : undefined,
          instructions: l.instructions != null ? String(l.instructions) : undefined,
        }))
        .filter((l) => l.medicationName);
      if (!lines.length) return null;
      return {
        lines,
        instructions:
          typeof parsed.instructions === "string" ? parsed.instructions : undefined,
      };
    }
    if (typeof parsed.medicationName === "string" && parsed.medicationName.trim()) {
      return {
        lines: [
          {
            medicationName: parsed.medicationName.trim(),
            dose: parsed.dose != null ? String(parsed.dose) : undefined,
            route: parsed.route != null ? String(parsed.route) : undefined,
            frequency: parsed.frequency != null ? String(parsed.frequency) : undefined,
            duration: parsed.duration != null ? String(parsed.duration) : undefined,
            quantity: parsed.quantity != null ? String(parsed.quantity) : undefined,
            instructions:
              parsed.instructions != null ? String(parsed.instructions) : undefined,
          },
        ],
      };
    }
  } catch {
    return null;
  }
  return null;
}

function asRxFields(value: unknown): RxFields | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.lines)) return null;
  const lines = o.lines
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => ({
      medicationName: String(l.medicationName ?? "").trim(),
      dose: l.dose != null ? String(l.dose) : undefined,
      route: l.route != null ? String(l.route) : undefined,
      frequency: l.frequency != null ? String(l.frequency) : undefined,
      duration: l.duration != null ? String(l.duration) : undefined,
      quantity: l.quantity != null ? String(l.quantity) : undefined,
      instructions: l.instructions != null ? String(l.instructions) : undefined,
    }))
    .filter((l) => l.medicationName);
  if (!lines.length) return null;
  return {
    lines,
    instructions: typeof o.instructions === "string" ? o.instructions : undefined,
  };
}

/**
 * Deterministic conflict surfacing against chart allergies + active meds (FR-021).
 * Runs before accept; independent of model output quality.
 */
export async function computeRxConflicts(
  content: RxFields,
  chart: Pick<AiChartContext, "allergies" | "activeMedications">,
): Promise<RxConflict[]> {
  const medNames = content.lines.map((l) => l.medicationName);
  const allergySubstances = chart.allergies.map((a) => a.substance);

  const safety = await runSafetyCheck({
    allergies: allergySubstances,
    medications: medNames,
  });

  const conflicts: RxConflict[] = [];

  for (const matchedMed of safety.allergyMatches) {
    const allergy =
      chart.allergies.find((a) => {
        const sub = a.substance.trim().toLowerCase();
        const med = matchedMed.trim().toLowerCase();
        return med.includes(sub) || sub.includes(med);
      }) ?? chart.allergies[0];

    const substance = allergy?.substance ?? matchedMed;
    conflicts.push({
      kind: "ALLERGY",
      detail: `Suggested ${matchedMed} conflicts with documented allergy to ${substance}`,
      evidence: `Chart allergy: ${substance}${allergy?.severity ? ` (${allergy.severity})` : ""}${allergy?.criticalFlag ? " [critical]" : ""}`,
    });
  }

  for (const active of chart.activeMedications) {
    const activeLower = active.medicationName.toLowerCase();
    for (const med of medNames) {
      const medLower = med.toLowerCase();
      for (const [a, b] of KNOWN_INTERACTION_PAIRS) {
        const pairHit =
          (activeLower.includes(a) && medLower.includes(b)) ||
          (activeLower.includes(b) && medLower.includes(a));
        if (pairHit) {
          conflicts.push({
            kind: "INTERACTION",
            detail: `Potential interaction between suggested ${med} and active ${active.medicationName}`,
            evidence: `Active medication on chart: ${active.medicationName}`,
          });
        }
      }
      // Duplicate / overlapping therapy soft flag
      if (
        activeLower.includes(medLower) ||
        medLower.includes(activeLower.split(/[,\s]/)[0] ?? "")
      ) {
        if (medLower.length >= 4 && activeLower.includes(medLower)) {
          conflicts.push({
            kind: "INTERACTION",
            detail: `Suggested ${med} overlaps with an active medication already on the chart`,
            evidence: `Active medication: ${active.medicationName}`,
          });
        }
      }
    }
  }

  // Dedupe by kind+detail
  const seen = new Set<string>();
  return conflicts.filter((c) => {
    const key = `${c.kind}:${c.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCdsInsights(chart: AiChartContext): CdsInsightDto[] {
  const items: CdsInsightDto[] = [];

  for (const allergy of chart.allergies) {
    const id = `cds:allergy:${encodeURIComponent(allergy.substance.toLowerCase())}`;
    items.push({
      id,
      title: `Documented allergy: ${allergy.substance}`,
      body: allergy.criticalFlag
        ? `Critical allergy to ${allergy.substance}. Avoid related agents when prescribing.`
        : `Patient has a documented allergy to ${allergy.substance}. Review before prescribing related agents.`,
      kind: "ALLERGY",
      evidence: `AllergyEntry: ${allergy.substance}${allergy.severity ? ` · severity ${allergy.severity}` : ""}`,
      chartCategories: ["allergies"],
    });
  }

  for (const med of chart.activeMedications) {
    const id = `cds:med:${encodeURIComponent(med.medicationName.toLowerCase().slice(0, 80))}`;
    items.push({
      id,
      title: `Active medication: ${med.medicationName}`,
      body: med.instructions
        ? `On ${med.medicationName} — ${med.instructions}. Check for interactions with new orders.`
        : `Patient is on ${med.medicationName}. Check for interactions with new orders.`,
      kind: "INTERACTION",
      evidence: `Active prescription: ${med.medicationName}`,
      chartCategories: ["activeMedications"],
    });
  }

  for (const condition of chart.conditions.slice(0, 8)) {
    const id = `cds:condition:${encodeURIComponent(condition.display.toLowerCase().slice(0, 80))}`;
    items.push({
      id,
      title: `Active condition: ${condition.display}`,
      body: `Documented active condition${condition.icd10Code ? ` (${condition.icd10Code})` : ""}. Consider relevance to current plan.`,
      kind: "HISTORY",
      evidence: `ConditionEntry: ${condition.display}`,
      chartCategories: ["conditions"],
    });
  }

  if (chart.emergency?.clinicianCriticalFlag || chart.emergency?.criticalAlertsText) {
    items.push({
      id: "cds:emergency:alerts",
      title: "Critical emergency alerts on chart",
      body:
        chart.emergency.criticalAlertsText?.trim() ||
        "Clinician critical flag is set on emergency info. Review before prescribing.",
      kind: "CARE_GAP",
      evidence: "EmergencyInfo critical alerts",
      chartCategories: ["emergency"],
    });
  }

  return items;
}

/**
 * Suggest a prescription draft for clinician review (FR-020/021).
 * Conflicts are computed deterministically against chart allergies/active meds
 * before the suggestion is returned — never deferred to accept/sign.
 */
export async function suggestPrescription(
  actor: EmrActor,
  input: { patientUserId: string; intent: string },
): Promise<PlatformResult<SuggestPrescriptionSuccess>> {
  const access = await assertDoctorFeatureAccess(actor, input.patientUserId, "RX_ASSIST");
  if (!access.ok) return access;

  const rate = checkAiRateLimit(actor.userId, "RX_ASSIST");
  if (!rate.ok) return rate;

  const budget = await checkBudget("RX_ASSIST");
  if (!budget.ok) {
    recordUsage({
      feature: "RX_ASSIST",
      role: actor.role,
      locale: "en",
      userId: actor.userId,
      outcome: "BUDGET_BLOCKED",
    });
    return budget;
  }

  const chartResult = await buildAiChartContext(actor, input.patientUserId);
  if (!chartResult.ok) return chartResult;
  const chart = chartResult.data;

  const emptyEvidence: DraftEvidence = {
    chartCategories: chart.allergies.length ? ["allergies"] : [],
    kbSources: [],
  };
  if (chart.activeMedications.length) {
    emptyEvidence.chartCategories = [
      ...new Set([...emptyEvidence.chartCategories, "activeMedications"]),
    ];
  }

  if (isUncertainRxIntent(input.intent)) {
    return platformOk({
      noSafeSuggestion: true,
      reason:
        "Intent is too uncertain to propose a safe medication suggestion. Provide a clearer clinical intent.",
      evidence: emptyEvidence,
      conflicts: [],
    });
  }

  const started = Date.now();
  const promptText = [
    "Suggest a prescription draft for clinician review only. Never sign or finalize.",
    'Respond with JSON only: {"lines":[{"medicationName":"","dose":"","route":"","frequency":"","duration":"","instructions":""}],"instructions":""}.',
    `Clinical intent: ${input.intent.trim()}`,
  ].join("\n");

  const gen = await generate({
    actor,
    patientUserId: input.patientUserId,
    feature: "RX_ASSIST",
    locale: "en",
    conversationId: `rx-suggest-${input.patientUserId}`,
    messages: [{ role: "user", content: promptText }],
    queryText: promptText,
  });

  let content: RxFields | null = null;
  let evidence = emptyEvidence;
  let promptVersionId: string | undefined;
  let modelConfigId: string | undefined;
  let modelName: string | undefined;
  let usage: { promptTokens?: number; completionTokens?: number } | undefined;
  let refused = false;

  if (gen.ok) {
    content = parseRxContent(gen.data.content);
    evidence = toEvidence(gen.data.evidence);
    promptVersionId = gen.data.promptVersionId;
    modelConfigId = gen.data.modelConfigId;
    modelName = gen.data.modelName;
    usage = gen.data.usage;
    refused = !!gen.data.refused;
  }

  if (!content) {
    content = resolveRxFromIntent(input.intent);
  }

  if (!content) {
    recordUsage({
      feature: "RX_ASSIST",
      role: actor.role,
      locale: "en",
      userId: actor.userId,
      modelConfigId,
      promptVersionId,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      latencyMs: Date.now() - started,
      outcome: refused ? "REFUSED" : "SUCCESS",
      modelName,
    });
    return platformOk({
      noSafeSuggestion: true,
      reason:
        "No safe medication suggestion could be determined for this intent. Refine the clinical request or prescribe manually.",
      evidence,
      conflicts: [],
    });
  }

  // Conflicts ALWAYS computed deterministically against chart — before accept.
  const conflicts = await computeRxConflicts(content, chart);
  if (chart.allergies.length || chart.activeMedications.length) {
    evidence = {
      chartCategories: [
        ...new Set([
          ...evidence.chartCategories,
          ...(chart.allergies.length ? ["allergies"] : []),
          ...(chart.activeMedications.length ? ["activeMedications"] : []),
        ]),
      ],
      kbSources: evidence.kbSources,
    };
  }

  const draft = await prisma.aiDraftArtifact.create({
    data: {
      kind: "RX_SUGGESTION",
      doctorUserId: actor.userId,
      patientUserId: input.patientUserId,
      content: content as unknown as Prisma.InputJsonValue,
      evidence: evidence as unknown as Prisma.InputJsonValue,
      conflicts: conflicts as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      promptVersionId,
      modelConfigId,
    },
  });

  recordUsage({
    feature: "RX_ASSIST",
    role: actor.role,
    locale: "en",
    userId: actor.userId,
    modelConfigId,
    promptVersionId,
    promptTokens: usage?.promptTokens,
    completionTokens: usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: refused ? "REFUSED" : "SUCCESS",
    modelName,
  });

  await aiAudit(
    "draft.generate",
    { userId: actor.userId },
    { userId: input.patientUserId },
    "SUCCESS",
    {
      draftId: draft.id,
      kind: "RX_SUGGESTION" satisfies AiDraftKind,
      conflictCount: conflicts.length,
    },
  );

  return platformOk({
    noSafeSuggestion: false,
    draftId: draft.id,
    content,
    evidence,
    conflicts,
  });
}

/**
 * Accept an RX_SUGGESTION AiDraftArtifact into the EMR prescription draft flow.
 * Never signs — signing stays exclusively in EMR (FR-017/045).
 */
export async function acceptRxDraft(
  actor: EmrActor,
  input: {
    draftId: string;
    edits?: Partial<RxFields>;
  },
): Promise<PlatformResult<{ draftId: string; acceptedIntoId: string }>> {
  const doctor = await requireDoctorActor(actor);
  if (!doctor.ok) return doctor;

  const draft = await prisma.aiDraftArtifact.findUnique({ where: { id: input.draftId } });
  if (!draft || draft.doctorUserId !== actor.userId) {
    return platformFail("NOT_FOUND", "Draft not found");
  }
  if (draft.kind !== "RX_SUGGESTION") {
    return platformFail("VALIDATION_ERROR", "Not an RX suggestion draft");
  }
  if (draft.status !== "PENDING") {
    return platformFail("CONFLICT", "Draft is not pending");
  }

  const access = await assertDoctorFeatureAccess(actor, draft.patientUserId, "RX_ASSIST");
  if (!access.ok) return access;

  const base = asRxFields(draft.content);
  if (!base) return platformFail("INTERNAL_FAILURE", "Invalid RX draft content");

  const content: RxFields = {
    lines: input.edits?.lines?.length ? input.edits.lines : base.lines,
    instructions: input.edits?.instructions ?? base.instructions,
  };

  const saved = await savePrescriptionDraft(actor, {
    patientUserId: draft.patientUserId,
    appointmentId: draft.appointmentId ?? null,
    instructions: content.instructions ?? "",
    aiAssisted: true,
    lines: content.lines.map((l) => ({
      medicationName: l.medicationName,
      dose: l.dose,
      route: l.route,
      frequency: l.frequency,
      duration: l.duration,
      quantity: l.quantity,
      instructions: l.instructions,
    })),
  });
  if (!saved.ok) return saved;

  const acceptedIntoId = saved.data.prescriptionId;

  const updated = await prisma.aiDraftArtifact.update({
    where: { id: draft.id },
    data: {
      status: "ACCEPTED",
      acceptedIntoId,
      content: content as unknown as Prisma.InputJsonValue,
    },
  });

  await aiAudit(
    "draft.accept",
    { userId: actor.userId },
    { userId: draft.patientUserId },
    "SUCCESS",
    {
      draftId: updated.id,
      kind: "RX_SUGGESTION" satisfies AiDraftKind,
      acceptedIntoId,
    },
  );

  return platformOk({ draftId: updated.id, acceptedIntoId });
}

export async function listCdsInsights(
  actor: EmrActor,
  input: { patientUserId: string },
): Promise<PlatformResult<{ items: CdsInsightDto[] }>> {
  const access = await assertDoctorFeatureAccess(actor, input.patientUserId, "CDS");
  if (!access.ok) return access;

  const rate = checkAiRateLimit(actor.userId, "CDS");
  if (!rate.ok) return rate;

  const chartResult = await buildAiChartContext(actor, input.patientUserId);
  if (!chartResult.ok) return chartResult;

  const dismissed =
    cdsDismissals.get(actor.userId)?.get(input.patientUserId) ?? new Set<string>();

  const items = buildCdsInsights(chartResult.data).filter((i) => !dismissed.has(i.id));

  return platformOk({ items });
}

export async function dismissCdsInsight(
  actor: EmrActor,
  input: { insightId: string; patientUserId: string },
): Promise<PlatformResult<{ id: string }>> {
  const access = await assertDoctorFeatureAccess(actor, input.patientUserId, "CDS");
  if (!access.ok) return access;

  let byPatient = cdsDismissals.get(actor.userId);
  if (!byPatient) {
    byPatient = new Map();
    cdsDismissals.set(actor.userId, byPatient);
  }
  let set = byPatient.get(input.patientUserId);
  if (!set) {
    set = new Set();
    byPatient.set(input.patientUserId, set);
  }
  set.add(input.insightId);

  return platformOk({ id: input.insightId });
}
