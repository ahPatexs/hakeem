import type { AiFeatureKey, AiModelConfig, AiProviderKind } from "@prisma/client";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 45_000;

type CacheEntry = { expiresAt: number; config: AiModelConfig };

const activeCache = new Map<AiFeatureKey, CacheEntry>();

function invalidate(feature?: AiFeatureKey) {
  if (feature) activeCache.delete(feature);
  else activeCache.clear();
}

export async function resolveActiveConfig(
  feature: AiFeatureKey,
): Promise<PlatformResult<AiModelConfig>> {
  const cached = activeCache.get(feature);
  if (cached && cached.expiresAt > Date.now()) {
    return platformOk(cached.config);
  }

  const config = await prisma.aiModelConfig.findFirst({
    where: { feature, active: true },
    orderBy: { version: "desc" },
  });
  if (!config) {
    const { fallbackModelConfig } = await import("./defaults");
    const runtime = fallbackModelConfig(feature);
    activeCache.set(feature, { expiresAt: Date.now() + CACHE_TTL_MS, config: runtime });
    return platformOk(runtime);
  }

  activeCache.set(feature, { expiresAt: Date.now() + CACHE_TTL_MS, config });
  return platformOk(config);
}

/** Resolve fallback model name from the active config (if any). */
export async function resolveFallbackModel(
  feature: AiFeatureKey,
): Promise<string | null> {
  const active = await resolveActiveConfig(feature);
  if (!active.ok) return null;
  return active.data.fallbackModel ?? null;
}

export async function saveModelConfig(input: {
  feature: AiFeatureKey;
  provider: AiProviderKind;
  modelName: string;
  fallbackModel?: string | null;
  temperature?: number;
  maxOutputTokens?: number;
  actorUserId: string;
}): Promise<PlatformResult<{ id: string; version: number }>> {
  const prior = await prisma.aiModelConfig.findFirst({
    where: { feature: input.feature },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (prior?.version ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    await tx.aiModelConfig.updateMany({
      where: { feature: input.feature, active: true },
      data: { active: false },
    });
    return tx.aiModelConfig.create({
      data: {
        feature: input.feature,
        provider: input.provider,
        modelName: input.modelName,
        fallbackModel: input.fallbackModel ?? null,
        temperature: input.temperature ?? 0.3,
        maxOutputTokens: input.maxOutputTokens ?? 1024,
        active: true,
        version: nextVersion,
        updatedBy: input.actorUserId,
      },
    });
  });

  invalidate(input.feature);
  return platformOk({ id: created.id, version: created.version });
}

export type ModelConfigDto = {
  id: string;
  feature: AiFeatureKey;
  provider: AiProviderKind;
  modelName: string;
  fallbackModel: string | null;
  temperature: number;
  maxOutputTokens: number;
  active: boolean;
  version: number;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listModelConfigs(): Promise<ModelConfigDto[]> {
  const rows = await prisma.aiModelConfig.findMany({
    orderBy: [{ feature: "asc" }, { version: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    feature: r.feature,
    provider: r.provider,
    modelName: r.modelName,
    fallbackModel: r.fallbackModel,
    temperature: r.temperature,
    maxOutputTokens: r.maxOutputTokens,
    active: r.active,
    version: r.version,
    updatedBy: r.updatedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export function __clearModelCache() {
  invalidate();
}
