"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { resolveAiActor, toActionResult, type AiActionResult } from "@/actions/ai/_actor";
import { aiAudit } from "@/lib/ai/audit";
import { saveBudget } from "@/lib/ai/budgets";
import {
  listModelConfigs,
  saveModelConfig,
  type ModelConfigDto,
} from "@/lib/ai/models";
import {
  getOpsDashboard,
  listBudgets,
  listGuardrailEvents,
  listUsage,
  type GuardrailEventDto,
  type OpsDashboard,
  type UsageRowDto,
  type UsageBucket,
  type CostBudgetRow,
} from "@/lib/ai/ops";
import {
  listPromptTemplates,
  publish,
  rollback,
  saveDraft,
  type TemplateWithVersions,
} from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";

const featureSchema = z.enum([
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
]);

const localeSchema = z.enum(["EN", "AR"]);

const periodSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

async function requireAdminActor() {
  const actor = await resolveAiActor();
  if (!actor.ok) return actor;
  if (actor.data.role !== "ADMIN") {
    void aiAudit(
      "access.denied",
      { userId: actor.data.userId },
      null,
      "DENIED",
      { action: "ai.admin", role: actor.data.role },
    ).catch(() => undefined);
    return { ok: false as const, code: "FORBIDDEN" as const };
  }
  return actor;
}

export async function aiAdminGetOpsDashboard(
  raw: unknown,
): Promise<AiActionResult<OpsDashboard>> {
  const parsed = periodSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  if (parsed.data.from > parsed.data.to) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  return { ok: true, data: await getOpsDashboard(parsed.data) };
}

export async function aiAdminListUsage(
  raw: unknown,
): Promise<
  AiActionResult<{
    items: UsageRowDto[];
    total: number;
    totalCostUsd: number;
    byFeature: UsageBucket[];
    byRole: UsageBucket[];
    byLocale: UsageBucket[];
  }>
> {
  const parsed = periodSchema
    .extend({
      feature: featureSchema.optional(),
      role: z.string().min(1).max(32).optional(),
      locale: localeSchema.optional(),
      page: z.number().int().positive().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  if (parsed.data.from > parsed.data.to) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  return { ok: true, data: await listUsage(parsed.data) };
}

export async function aiAdminSaveBudget(
  raw: unknown,
): Promise<AiActionResult<{ id: string }>> {
  const parsed = z
    .object({
      scope: z.enum(["GLOBAL", "FEATURE"]),
      feature: featureSchema.optional().nullable(),
      monthlyUsd: z.number().finite().nonnegative(),
      alertThreshold: z.number().int().min(1).max(100),
      hardCap: z.boolean(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  const result = await saveBudget({
    scope: parsed.data.scope,
    feature: parsed.data.feature ?? null,
    monthlyUsd: parsed.data.monthlyUsd,
    alertThreshold: parsed.data.alertThreshold,
    hardCap: parsed.data.hardCap,
    actorUserId: actor.data.userId,
  });

  if (result.ok) {
    await aiAudit(
      "budget.change",
      { userId: actor.data.userId },
      null,
      "SUCCESS",
      {
        scope: parsed.data.scope,
        feature: parsed.data.feature ?? null,
        monthlyUsd: parsed.data.monthlyUsd,
        alertThreshold: parsed.data.alertThreshold,
        hardCap: parsed.data.hardCap,
        id: result.data.id,
      },
    );
    revalidatePath("/admin/ai");
    revalidatePath("/admin/ai/budgets");
  }

  return toActionResult(result);
}

export async function aiAdminGetGuardrailEvents(
  raw: unknown,
): Promise<AiActionResult<{ items: GuardrailEventDto[]; total: number }>> {
  const parsed = periodSchema
    .extend({
      trigger: z.enum(["RED_FLAG", "INJECTION", "OUTPUT_POLICY", "CONSENT_BLOCK"]).optional(),
      page: z.number().int().positive().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  if (parsed.data.from > parsed.data.to) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  return { ok: true, data: await listGuardrailEvents(parsed.data) };
}

export async function aiAdminListBudgets(): Promise<AiActionResult<CostBudgetRow[]>> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };
  return { ok: true, data: await listBudgets() };
}

export async function aiAdminListPromptTemplates(): Promise<
  AiActionResult<{ items: TemplateWithVersions[] }>
> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };
  return { ok: true, data: { items: await listPromptTemplates() } };
}

export async function aiAdminSavePromptDraft(
  raw: unknown,
): Promise<AiActionResult<{ versionId: string; version: number }>> {
  const parsed = z
    .object({
      templateId: z.string().min(1),
      bodyEn: z.string().min(1).max(50_000),
      bodyAr: z.string().min(1).max(50_000),
      changeNote: z.string().max(2000).optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  const template = await prisma.aiPromptTemplate.findUnique({
    where: { id: parsed.data.templateId },
    select: { feature: true },
  });
  if (!template) return { ok: false, code: "NOT_FOUND" };

  const result = await saveDraft({
    feature: template.feature,
    bodyEn: parsed.data.bodyEn,
    bodyAr: parsed.data.bodyAr,
    changeNote: parsed.data.changeNote,
    actorUserId: actor.data.userId,
  });

  if (result.ok) {
    revalidatePath("/admin/ai/prompts");
  }

  return toActionResult(result);
}

export async function aiAdminPublishPrompt(
  raw: unknown,
): Promise<AiActionResult<{ versionId: string }>> {
  const parsed = z.object({ versionId: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  const result = await publish({
    versionId: parsed.data.versionId,
    actorUserId: actor.data.userId,
  });

  if (result.ok) {
    await aiAudit(
      "prompt.publish",
      { userId: actor.data.userId },
      null,
      "SUCCESS",
      { versionId: result.data.versionId, feature: result.data.feature },
    );
    revalidatePath("/admin/ai/prompts");
  }

  return toActionResult(
    result.ok
      ? { ok: true, data: { versionId: result.data.versionId } }
      : result,
  );
}

export async function aiAdminRollbackPrompt(
  raw: unknown,
): Promise<AiActionResult<{ versionId: string }>> {
  const parsed = z
    .object({
      templateId: z.string().min(1),
      toVersion: z.number().int().positive(),
      reason: z.string().min(1).max(2000),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  const result = await rollback({
    templateId: parsed.data.templateId,
    toVersion: parsed.data.toVersion,
    reason: parsed.data.reason,
    actorUserId: actor.data.userId,
  });

  if (result.ok) {
    await aiAudit(
      "prompt.rollback",
      { userId: actor.data.userId },
      null,
      "SUCCESS",
      {
        templateId: parsed.data.templateId,
        toVersion: parsed.data.toVersion,
        reason: parsed.data.reason,
        versionId: result.data.versionId,
        version: result.data.version,
      },
    );
    revalidatePath("/admin/ai/prompts");
  }

  return toActionResult(
    result.ok
      ? { ok: true, data: { versionId: result.data.versionId } }
      : result,
  );
}

export async function aiAdminListModelConfigs(): Promise<
  AiActionResult<{ items: ModelConfigDto[] }>
> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };
  return { ok: true, data: { items: await listModelConfigs() } };
}

export async function aiAdminSaveModelConfig(
  raw: unknown,
): Promise<AiActionResult<{ id: string; version: number }>> {
  const parsed = z
    .object({
      feature: featureSchema,
      provider: z.enum(["OPENAI", "STUB"]),
      modelName: z.string().min(1).max(128),
      fallbackModel: z.string().max(128).optional().nullable(),
      temperature: z.number().min(0).max(2).optional(),
      maxOutputTokens: z.number().int().positive().max(128_000).optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await requireAdminActor();
  if (!actor.ok) return { ok: false, code: actor.code };

  const result = await saveModelConfig({
    feature: parsed.data.feature,
    provider: parsed.data.provider,
    modelName: parsed.data.modelName,
    fallbackModel: parsed.data.fallbackModel,
    temperature: parsed.data.temperature,
    maxOutputTokens: parsed.data.maxOutputTokens,
    actorUserId: actor.data.userId,
  });

  if (result.ok) {
    await aiAudit(
      "model.change",
      { userId: actor.data.userId },
      null,
      "SUCCESS",
      {
        feature: parsed.data.feature,
        provider: parsed.data.provider,
        modelName: parsed.data.modelName,
        fallbackModel: parsed.data.fallbackModel ?? null,
        id: result.data.id,
        version: result.data.version,
      },
    );
    revalidatePath("/admin/ai/models");
  }

  return toActionResult(result);
}
