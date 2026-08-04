import type { AiBudgetScope, AiCostBudget, AiFeatureKey } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { checkSpend } from "@/domain/ai/budget";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import { prisma } from "@/lib/prisma";

function monthStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function monthToDateSpendUsd(feature?: AiFeatureKey | null): Promise<number> {
  const from = monthStart();
  const where = feature
    ? { createdAt: { gte: from }, feature }
    : { createdAt: { gte: from } };

  const agg = await prisma.aiUsageEvent.aggregate({
    where,
    _sum: { estimatedCostUsd: true },
  });
  return Number(agg._sum.estimatedCostUsd ?? 0);
}

async function resolveBudget(feature: AiFeatureKey): Promise<AiCostBudget | null> {
  const featureBudget = await prisma.aiCostBudget.findFirst({
    where: { scope: "FEATURE", feature },
  });
  if (featureBudget) return featureBudget;

  return prisma.aiCostBudget.findFirst({
    where: { scope: "GLOBAL", feature: null },
  });
}

export type BudgetOk = {
  allowed: true;
  budget: AiCostBudget | null;
  spentUsd: number;
  utilizationPct: number;
};

/**
 * Pre-flight budget check. Threshold breach notifies admins once per period
 * (tracked via breachedAt). Hard cap → BUDGET_EXHAUSTED.
 */
export async function checkBudget(
  feature: AiFeatureKey,
): Promise<PlatformResult<BudgetOk>> {
  const budget = await resolveBudget(feature);
  if (!budget) {
    return platformOk({
      allowed: true,
      budget: null,
      spentUsd: 0,
      utilizationPct: 0,
    });
  }

  const spentUsd =
    budget.scope === "FEATURE"
      ? await monthToDateSpendUsd(budget.feature ?? feature)
      : await monthToDateSpendUsd(null);

  const monthlyUsd = Number(budget.monthlyUsd);
  const status = checkSpend(spentUsd, monthlyUsd, budget.alertThreshold, budget.hardCap);
  const utilizationPct = monthlyUsd <= 0 ? (spentUsd > 0 ? 100 : 0) : (spentUsd / monthlyUsd) * 100;

  if (status === "ALERT" || status === "BLOCKED") {
    const periodStart = monthStart();
    const alreadyNotified =
      budget.breachedAt != null && budget.breachedAt >= periodStart;
    if (!alreadyNotified) {
      await prisma.aiCostBudget.update({
        where: { id: budget.id },
        data: { breachedAt: new Date() },
      });
      await notifyAdmins({
        category: "AI_GOVERNANCE",
        title: "AI budget threshold reached",
        body: `AI spend reached ${utilizationPct.toFixed(0)}% of the ${budget.scope === "FEATURE" ? feature : "global"} monthly budget ($${spentUsd.toFixed(2)} / $${monthlyUsd.toFixed(2)}).`,
        href: "/admin/ai/budgets",
      });
    }
  }

  if (status === "BLOCKED") {
    return platformFail(
      "BUDGET_EXHAUSTED",
      "AI budget hard cap reached for this period",
    );
  }

  return platformOk({
    allowed: true,
    budget,
    spentUsd,
    utilizationPct,
  });
}

export async function saveBudget(input: {
  scope: AiBudgetScope;
  feature?: AiFeatureKey | null;
  monthlyUsd: number;
  alertThreshold: number;
  hardCap: boolean;
  actorUserId: string;
}): Promise<PlatformResult<{ id: string }>> {
  if (input.scope === "FEATURE" && !input.feature) {
    return platformFail("VALIDATION_ERROR", "FEATURE scope requires feature");
  }
  if (input.scope === "GLOBAL" && input.feature) {
    return platformFail("VALIDATION_ERROR", "GLOBAL scope must not set feature");
  }

  const feature = input.scope === "GLOBAL" ? null : (input.feature as AiFeatureKey);

  const existing = await prisma.aiCostBudget.findFirst({
    where:
      input.scope === "GLOBAL"
        ? { scope: "GLOBAL", feature: null }
        : { scope: "FEATURE", feature: feature! },
  });

  const data = {
    monthlyUsd: new Prisma.Decimal(input.monthlyUsd),
    alertThreshold: input.alertThreshold,
    hardCap: input.hardCap,
    updatedBy: input.actorUserId,
    breachedAt: null as Date | null,
  };

  const row = existing
    ? await prisma.aiCostBudget.update({ where: { id: existing.id }, data })
    : await prisma.aiCostBudget.create({
        data: {
          scope: input.scope,
          feature,
          ...data,
        },
      });

  return platformOk({ id: row.id });
}
