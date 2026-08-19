import type { AiRecommendation, LocaleCode } from "@prisma/client";
import type { AiActor } from "@/actions/ai/_actor";
import { canAccessAiFeature } from "@/domain/ai/access";
import { PERSONALIZED_CHART_CATEGORIES } from "@/domain/ai/context-policy";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import type { AiChartContext } from "@/lib/emr/ai-context";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";
import { checkBudget } from "./budgets";
import { requireFeatureAi } from "./governance-gate";
import { assembleContext } from "./context";
import { recordUsage } from "./metering";
import { checkAiRateLimit } from "./rate-limit";
import type { KnowledgeHit } from "./vector";

/** Patient-visible chart categories allowed in recommendation reasons (FR-013). */
export const PATIENT_VISIBLE_SOURCE_KINDS = new Set<string>(PERSONALIZED_CHART_CATEGORIES);

export type RecommendationDto = {
  id: string;
  title: string;
  body: string;
  reason: string;
  sourceKinds: string[];
  createdAt: string;
};

export type EducationItemDto = {
  id: string;
  slug: string;
  title: string;
  body: string;
  kind: string;
  locale: "en" | "ar";
};

type RecommendationDraft = {
  title: string;
  body: string;
  reason: string;
  sourceKinds: string[];
};

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

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDto(row: AiRecommendation): RecommendationDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    reason: row.reason,
    sourceKinds: row.sourceKinds,
    createdAt: row.createdAt.toISOString(),
  };
}

function assertPatientRecommendationsAccess(
  actor: AiActor,
): PlatformResult<{ allowed: true }> {
  if (actor.role !== "PATIENT") {
    return platformFail("FORBIDDEN", "Recommendations are patient-only");
  }
  if (!canAccessAiFeature(actor.role, "RECOMMENDATIONS")) {
    return platformFail("FORBIDDEN", "AI feature not allowed for role");
  }
  return platformOk({ allowed: true });
}

function hasRelevantChartData(chart: AiChartContext | null): boolean {
  if (!chart) return false;
  return (
    chart.conditions.length > 0 ||
    chart.allergies.length > 0 ||
    chart.activeMedications.length > 0 ||
    chart.releasedLabs.length > 0
  );
}

/** Keep only patient-visible category labels in sourceKinds (FR-013). */
export function sanitizeSourceKinds(kinds: string[]): string[] {
  return [...new Set(kinds.filter((k) => PATIENT_VISIBLE_SOURCE_KINDS.has(k)))];
}

function generalWellnessDrafts(
  locale: "en" | "ar",
  kbHits: KnowledgeHit[],
): RecommendationDraft[] {
  if (kbHits.length > 0) {
    return kbHits.slice(0, 3).map((hit) => ({
      title: hit.title,
      body: hit.content.slice(0, 600),
      reason:
        locale === "ar"
          ? "محتوى تثقيفي عام للصحة والعافية — غير مخصص لملفك الطبي."
          : "General wellness education — not personalized to your chart.",
      sourceKinds: [] as string[],
    }));
  }

  if (locale === "ar") {
    return [
      {
        title: "عادات نوم صحية",
        body: "احرص على جدول نوم ثابت وغرفة هادئة وقلل الشاشات قبل النوم. ناقش الشخير المستمر أو النعاس النهاري مع مختص رعاية صحية.",
        reason: "محتوى عافية عام — لا توجد بيانات شخصية كافية للتخصيص.",
        sourceKinds: [],
      },
      {
        title: "الترطيب اليومي",
        body: "اشرب الماء بانتظام خلال اليوم وزد السوائل عند الحر أو الرياضة أو الحمى. اطلب الرعاية إذا لم تستطع الاحتفاظ بالسوائل.",
        reason: "محتوى عافية عام — لا توجد بيانات شخصية كافية للتخصيص.",
        sourceKinds: [],
      },
    ];
  }

  return [
    {
      title: "Healthy sleep habits",
      body: "Aim for a consistent sleep schedule, a quiet dark room, and limited screens before bed. Discuss persistent snoring or daytime sleepiness with a clinician.",
      reason: "General wellness content — not enough personal chart data to personalize.",
      sourceKinds: [],
    },
    {
      title: "Stay hydrated",
      body: "Drink water regularly through the day and increase fluids in heat, exercise, or fever. Seek care if you cannot keep fluids down.",
      reason: "General wellness content — not enough personal chart data to personalize.",
      sourceKinds: [],
    },
  ];
}

function personalizedDrafts(
  chart: AiChartContext,
  locale: "en" | "ar",
  kbHits: KnowledgeHit[],
): RecommendationDraft[] {
  const drafts: RecommendationDraft[] = [];

  for (const condition of chart.conditions.slice(0, 2)) {
    drafts.push({
      title:
        locale === "ar"
          ? `نصائح للتعايش مع ${condition.display}`
          : `Living well with ${condition.display}`,
      body:
        locale === "ar"
          ? `راجع خطة رعايتك بانتظام، والتزم بالأدوية الموصوفة، وناقش أي أعراض جديدة مع طبيبك. هذا إرشاد عام وليس تشخيصاً.`
          : `Review your care plan regularly, take prescribed medicines as directed, and discuss new symptoms with your clinician. This is general guidance, not a diagnosis.`,
      reason:
        locale === "ar"
          ? `لأن ملفك يذكر الحالة: ${condition.display}`
          : `Because your profile lists the condition: ${condition.display}`,
      sourceKinds: sanitizeSourceKinds(["conditions"]),
    });
  }

  for (const allergy of chart.allergies.slice(0, 1)) {
    drafts.push({
      title:
        locale === "ar"
          ? `تذكير بالسلامة: حساسية ${allergy.substance}`
          : `Safety reminder: ${allergy.substance} allergy`,
      body:
        locale === "ar"
          ? `احرص على إبلاغ كل مقدّم رعاية بحساسيتك وتجنب المواد المحفّزة. احمل معلومات الطوارئ إن أوصى بها طبيبك.`
          : `Tell every care provider about this allergy and avoid triggering substances. Carry emergency information if your clinician recommends it.`,
      reason:
        locale === "ar"
          ? `لأن ملفك يذكر الحساسية: ${allergy.substance}`
          : `Because your profile lists the allergy: ${allergy.substance}`,
      sourceKinds: sanitizeSourceKinds(["allergies"]),
    });
  }

  for (const med of chart.activeMedications.slice(0, 1)) {
    drafts.push({
      title:
        locale === "ar"
          ? `استخدام آمن لـ ${med.medicationName}`
          : `Taking ${med.medicationName} safely`,
      body:
        locale === "ar"
          ? `التزم بالجرعة والتعليمات، ولا توقّف الدواء دون استشارة، واسأل عن التفاعلات مع أي دواء جديد.`
          : `Follow the dose and instructions, do not stop without advice, and ask about interactions before starting anything new.`,
      reason:
        locale === "ar"
          ? `لأن ملفك يذكر الدواء النشط: ${med.medicationName}`
          : `Because your profile lists the active medication: ${med.medicationName}`,
      sourceKinds: sanitizeSourceKinds(["medications"]),
    });
  }

  if (chart.releasedLabs.length > 0 && drafts.length < 3) {
    const lab = chart.releasedLabs[0]!;
    drafts.push({
      title:
        locale === "ar"
          ? `فهم نتيجة: ${lab.title}`
          : `Understanding your result: ${lab.title}`,
      body:
        locale === "ar"
          ? `راجع الملخص في سجلاتك واطرح أسئلة على طبيبك في الزيارة القادمة. لا تفسّر النتائج بمفردك كتشخيص.`
          : `Review the summary in your records and ask your clinician at the next visit. Do not treat results alone as a diagnosis.`,
      reason:
        locale === "ar"
          ? `لأن لديك نتيجة مختبرية ظاهرة: ${lab.title}`
          : `Because you have a released lab result: ${lab.title}`,
      sourceKinds: sanitizeSourceKinds(["labs"]),
    });
  }

  // Optional KB enrichment when personalization still has room
  if (drafts.length < 2 && kbHits[0]) {
    const hit = kbHits[0];
    const kinds = sanitizeSourceKinds(drafts.flatMap((d) => d.sourceKinds));
    drafts.push({
      title: hit.title,
      body: hit.content.slice(0, 600),
      reason:
        locale === "ar"
          ? "محتوى تعليمي مرتبط بملفك الصحي الظاهر لك."
          : "Education content related to information already visible in your profile.",
      sourceKinds: kinds,
    });
  }

  return drafts.slice(0, 5);
}

async function generateRecommendations(
  actor: AiActor,
  locale: "en" | "ar",
): Promise<PlatformResult<RecommendationDto[]>> {
  const emrActor = toEmrActor(actor);
  const ctx = await assembleContext(emrActor, actor.userId, "RECOMMENDATIONS", locale);
  if (!ctx.ok) return ctx;

  const usePersonalized =
    ctx.data.mode === "PERSONALIZED" && hasRelevantChartData(ctx.data.chart);

  const drafts = usePersonalized
    ? personalizedDrafts(ctx.data.chart!, locale, ctx.data.kbHits)
    : generalWellnessDrafts(locale, ctx.data.kbHits);

  // Fail closed: never persist non-patient-visible source kinds
  let safeDrafts = drafts.map((d) => ({
    ...d,
    sourceKinds: sanitizeSourceKinds(d.sourceKinds),
  }));

  if (safeDrafts.length === 0) {
    safeDrafts = generalWellnessDrafts(locale, []).map((d) => ({
      ...d,
      sourceKinds: sanitizeSourceKinds(d.sourceKinds),
    }));
  }

  const created = await prisma.$transaction(
    safeDrafts.map((d) =>
      prisma.aiRecommendation.create({
        data: {
          patientUserId: actor.userId,
          locale: toLocaleCode(locale),
          title: d.title,
          body: d.body,
          reason: d.reason,
          sourceKinds: d.sourceKinds,
          status: "ACTIVE",
        },
      }),
    ),
  );

  recordUsage({
    feature: "RECOMMENDATIONS",
    role: actor.role,
    locale,
    userId: actor.userId,
    outcome: "SUCCESS",
    promptTokens: 0,
    completionTokens: 0,
    latencyMs: 0,
  });

  return platformOk(created.map(toDto));
}

/**
 * List ACTIVE recommendations for the patient. Generates at most once per UTC day
 * when none are active (per-(patient, day) regeneration guard).
 */
export async function listRecommendations(
  actor: AiActor,
  input: { locale?: "en" | "ar" } = {},
): Promise<PlatformResult<{ items: RecommendationDto[] }>> {
  const access = assertPatientRecommendationsAccess(actor);
  if (!access.ok) {
    await aiAudit(
      "access.denied",
      { userId: actor.userId },
      { userId: actor.userId },
      "DENIED",
      { feature: "RECOMMENDATIONS", role: actor.role },
    );
    return access;
  }

  const rate = checkAiRateLimit(actor.userId, "RECOMMENDATIONS");
  if (!rate.ok) return rate;

  const budget = await checkBudget("RECOMMENDATIONS");
  if (!budget.ok) return budget;

  const locale = input.locale ?? "en";

  const active = await prisma.aiRecommendation.findMany({
    where: { patientUserId: actor.userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (active.length > 0) {
    return platformOk({ items: active.map(toDto) });
  }

  const generatedToday = await prisma.aiRecommendation.count({
    where: {
      patientUserId: actor.userId,
      createdAt: { gte: startOfUtcDay() },
    },
  });

  if (generatedToday > 0) {
    // Already generated today; all dismissed — do not regenerate until next day
    return platformOk({ items: [] });
  }

  const allowed = await requireFeatureAi(actor.userId, "RECOMMENDATIONS");
  if (!allowed.ok) return allowed;

  const generated = await generateRecommendations(actor, locale);
  if (!generated.ok) return generated;
  return platformOk({ items: generated.data });
}

export async function dismissRecommendation(
  actor: AiActor,
  input: { recommendationId: string },
): Promise<PlatformResult<{ id: string }>> {
  const access = assertPatientRecommendationsAccess(actor);
  if (!access.ok) {
    await aiAudit(
      "access.denied",
      { userId: actor.userId },
      { userId: actor.userId },
      "DENIED",
      { feature: "RECOMMENDATIONS", role: actor.role },
    );
    return access;
  }

  const row = await prisma.aiRecommendation.findUnique({
    where: { id: input.recommendationId },
  });

  if (!row || row.patientUserId !== actor.userId) {
    return platformFail("NOT_FOUND", "Recommendation not found");
  }

  if (row.status === "DISMISSED") {
    return platformOk({ id: row.id });
  }

  await prisma.aiRecommendation.update({
    where: { id: row.id },
    data: { status: "DISMISSED" },
  });

  return platformOk({ id: row.id });
}

/** Locale-filtered published KB education / self-care / wellness docs (FR-013). */
export async function listEducationContent(
  actor: AiActor,
  input: { locale: "en" | "ar" },
): Promise<PlatformResult<{ items: EducationItemDto[] }>> {
  const access = assertPatientRecommendationsAccess(actor);
  if (!access.ok) return access;

  const localeCode = toLocaleCode(input.locale);
  const docs = await prisma.aiKnowledgeDoc.findMany({
    where: {
      status: "PUBLISHED",
      locale: localeCode,
      kind: { in: ["education", "self-care", "wellness"] },
    },
    orderBy: { title: "asc" },
    take: 24,
  });

  return platformOk({
    items: docs.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      body: d.content,
      kind: d.kind,
      locale: toPortLocale(d.locale),
    })),
  });
}
