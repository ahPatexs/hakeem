import type {
  AiFeatureKey,
  AiGuardrailTrigger,
  AiUsageOutcome,
  LocaleCode,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export type OpsPeriod = { from: Date; to: Date };

export type UsageBucket = { key: string; count: number };

export type CostBudgetRow = {
  id: string;
  scope: "GLOBAL" | "FEATURE";
  feature: AiFeatureKey | null;
  monthlyUsd: number;
  spentUsd: number;
  utilizationPct: number;
  alertThreshold: number;
  hardCap: boolean;
  breached: boolean;
};

export type OpsDashboard = {
  usage: {
    total: number;
    byFeature: UsageBucket[];
    byRole: UsageBucket[];
    byLocale: UsageBucket[];
  };
  cost: {
    totalUsd: number;
    byFeature: Array<{ key: string; usd: number }>;
    budgets: CostBudgetRow[];
  };
  latency: { p50Ms: number; p95Ms: number };
  errors: {
    total: number;
    errorCount: number;
    refusedCount: number;
    errorRate: number;
    refusalRate: number;
  };
  guardrails: {
    total: number;
    byTrigger: UsageBucket[];
  };
  feedback: {
    helpful: number;
    notHelpful: number;
    flagged: number;
    helpfulRatio: number;
  };
};

/** Metadata-only usage row — never includes message content (FR-035). */
export type UsageRowDto = {
  id: string;
  feature: AiFeatureKey;
  role: string;
  locale: LocaleCode;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  outcome: AiUsageOutcome;
  estimatedCostUsd: number;
  createdAt: Date;
};

export type GuardrailEventDto = {
  id: string;
  trigger: AiGuardrailTrigger;
  feature: AiFeatureKey;
  role: string;
  category: string | null;
  createdAt: Date;
};

function periodWhere(period: OpsPeriod) {
  return { createdAt: { gte: period.from, lte: period.to } };
}

/** Nearest-rank percentile over a pre-sorted ascending array. */
export function percentileNearest(sortedAsc: number[], pct: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((pct / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, Math.min(sortedAsc.length - 1, rank))]!;
}

function rate(part: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

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

/**
 * Period-scoped ops aggregates over usage / guardrail / feedback tables.
 * Returns metrics only — never message content (FR-034/037).
 */
export async function getOpsDashboard(period: OpsPeriod): Promise<OpsDashboard> {
  const where = periodWhere(period);

  const [
    total,
    byFeatureRows,
    byRoleRows,
    byLocaleRows,
    costAgg,
    costByFeatureRows,
    outcomeRows,
    latencyRows,
    guardrailTotal,
    guardrailByTrigger,
    feedbackRows,
    budgets,
  ] = await Promise.all([
    prisma.aiUsageEvent.count({ where }),
    prisma.aiUsageEvent.groupBy({
      by: ["feature"],
      where,
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["role"],
      where,
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["locale"],
      where,
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.aggregate({
      where,
      _sum: { estimatedCostUsd: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["feature"],
      where,
      _sum: { estimatedCostUsd: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["outcome"],
      where,
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.findMany({
      where,
      select: { latencyMs: true },
      orderBy: { latencyMs: "asc" },
      take: 50_000,
    }),
    prisma.aiGuardrailEvent.count({ where }),
    prisma.aiGuardrailEvent.groupBy({
      by: ["trigger"],
      where,
      _count: { _all: true },
    }),
    prisma.aiFeedback.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
    }),
    prisma.aiCostBudget.findMany({ orderBy: [{ scope: "asc" }, { feature: "asc" }] }),
  ]);

  const latencies = latencyRows.map((r) => r.latencyMs);
  const outcomeMap = new Map(outcomeRows.map((r) => [r.outcome, r._count._all]));
  const errorCount = outcomeMap.get("ERROR") ?? 0;
  const refusedCount = outcomeMap.get("REFUSED") ?? 0;

  const feedbackMap = new Map(feedbackRows.map((r) => [r.rating, r._count._all]));
  const helpful = feedbackMap.get("HELPFUL") ?? 0;
  const notHelpful = feedbackMap.get("NOT_HELPFUL") ?? 0;
  const flagged = feedbackMap.get("FLAGGED") ?? 0;
  const feedbackTotal = helpful + notHelpful + flagged;

  const budgetRows: CostBudgetRow[] = await Promise.all(
    budgets.map(async (b) => {
      const spentUsd =
        b.scope === "FEATURE"
          ? await monthToDateSpendUsd(b.feature)
          : await monthToDateSpendUsd(null);
      const monthlyUsd = Number(b.monthlyUsd);
      const utilizationPct =
        monthlyUsd <= 0 ? (spentUsd > 0 ? 100 : 0) : (spentUsd / monthlyUsd) * 100;
      const periodStart = monthStart();
      const breached =
        utilizationPct >= b.alertThreshold ||
        (b.breachedAt != null && b.breachedAt >= periodStart);
      return {
        id: b.id,
        scope: b.scope,
        feature: b.feature,
        monthlyUsd,
        spentUsd,
        utilizationPct: Number(utilizationPct.toFixed(2)),
        alertThreshold: b.alertThreshold,
        hardCap: b.hardCap,
        breached,
      };
    }),
  );

  return {
    usage: {
      total,
      byFeature: byFeatureRows.map((r) => ({ key: r.feature, count: r._count._all })),
      byRole: byRoleRows.map((r) => ({ key: r.role, count: r._count._all })),
      byLocale: byLocaleRows.map((r) => ({ key: r.locale, count: r._count._all })),
    },
    cost: {
      totalUsd: Number(costAgg._sum.estimatedCostUsd ?? 0),
      byFeature: costByFeatureRows.map((r) => ({
        key: r.feature,
        usd: Number(r._sum.estimatedCostUsd ?? 0),
      })),
      budgets: budgetRows,
    },
    latency: {
      p50Ms: percentileNearest(latencies, 50),
      p95Ms: percentileNearest(latencies, 95),
    },
    errors: {
      total,
      errorCount,
      refusedCount,
      errorRate: rate(errorCount, total),
      refusalRate: rate(refusedCount, total),
    },
    guardrails: {
      total: guardrailTotal,
      byTrigger: guardrailByTrigger.map((r) => ({
        key: r.trigger,
        count: r._count._all,
      })),
    },
    feedback: {
      helpful,
      notHelpful,
      flagged,
      helpfulRatio: rate(helpful, feedbackTotal),
    },
  };
}

export async function listUsage(input: {
  from: Date;
  to: Date;
  feature?: AiFeatureKey;
  role?: string;
  locale?: LocaleCode;
  page?: number;
}): Promise<{ items: UsageRowDto[]; total: number; totalCostUsd: number }> {
  const page = Math.max(1, input.page ?? 1);
  const where = {
    createdAt: { gte: input.from, lte: input.to },
    ...(input.feature ? { feature: input.feature } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.locale ? { locale: input.locale } : {}),
  };

  const [rows, total, costAgg] = await Promise.all([
    prisma.aiUsageEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        feature: true,
        role: true,
        locale: true,
        promptTokens: true,
        completionTokens: true,
        latencyMs: true,
        outcome: true,
        estimatedCostUsd: true,
        createdAt: true,
      },
    }),
    prisma.aiUsageEvent.count({ where }),
    prisma.aiUsageEvent.aggregate({
      where,
      _sum: { estimatedCostUsd: true },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      feature: r.feature,
      role: r.role,
      locale: r.locale,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      latencyMs: r.latencyMs,
      outcome: r.outcome,
      estimatedCostUsd: Number(r.estimatedCostUsd),
      createdAt: r.createdAt,
    })),
    total,
    totalCostUsd: Number(costAgg._sum.estimatedCostUsd ?? 0),
  };
}

export async function listGuardrailEvents(input: {
  from: Date;
  to: Date;
  trigger?: AiGuardrailTrigger;
  page?: number;
}): Promise<{ items: GuardrailEventDto[]; total: number }> {
  const page = Math.max(1, input.page ?? 1);
  const where = {
    createdAt: { gte: input.from, lte: input.to },
    ...(input.trigger ? { trigger: input.trigger } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.aiGuardrailEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        trigger: true,
        feature: true,
        role: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.aiGuardrailEvent.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      trigger: r.trigger,
      feature: r.feature,
      role: r.role,
      category: r.category,
      createdAt: r.createdAt,
    })),
    total,
  };
}

export async function listBudgets(): Promise<CostBudgetRow[]> {
  const budgets = await prisma.aiCostBudget.findMany({
    orderBy: [{ scope: "asc" }, { feature: "asc" }],
  });
  return Promise.all(
    budgets.map(async (b) => {
      const spentUsd =
        b.scope === "FEATURE"
          ? await monthToDateSpendUsd(b.feature)
          : await monthToDateSpendUsd(null);
      const monthlyUsd = Number(b.monthlyUsd);
      const utilizationPct =
        monthlyUsd <= 0 ? (spentUsd > 0 ? 100 : 0) : (spentUsd / monthlyUsd) * 100;
      const periodStart = monthStart();
      return {
        id: b.id,
        scope: b.scope,
        feature: b.feature,
        monthlyUsd,
        spentUsd,
        utilizationPct: Number(utilizationPct.toFixed(2)),
        alertThreshold: b.alertThreshold,
        hardCap: b.hardCap,
        breached:
          utilizationPct >= b.alertThreshold ||
          (b.breachedAt != null && b.breachedAt >= periodStart),
      };
    }),
  );
}
