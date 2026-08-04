/**
 * Integration: prompt draft → publish (archives prior) → compose uses new
 * version → rollback appends re-published clone → cache invalidates;
 * model config save bumps version + one-active invariant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiFeatureKey, AiPromptStatus, AiProviderKind } from "@prisma/client";

type TemplateRow = {
  id: string;
  feature: AiFeatureKey;
  name: string;
};

type VersionRow = {
  id: string;
  templateId: string;
  version: number;
  bodyEn: string;
  bodyAr: string;
  status: AiPromptStatus;
  changeNote: string | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
};

type ModelRow = {
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

const store = {
  templates: [] as TemplateRow[],
  versions: [] as VersionRow[],
  models: [] as ModelRow[],
  idSeq: 0,
};

function nextId(prefix: string) {
  store.idSeq += 1;
  return `${prefix}-${store.idSeq}`;
}

function resetStore() {
  store.templates = [];
  store.versions = [];
  store.models = [];
  store.idSeq = 0;
}

vi.mock("@/lib/prisma", () => {
  const tx = {
    aiPromptVersion: {
      updateMany: vi.fn(async (args: { where: Record<string, unknown>; data: Partial<VersionRow> }) => {
        let count = 0;
        for (const v of store.versions) {
          if (args.where.templateId && v.templateId !== args.where.templateId) continue;
          if (args.where.status && v.status !== args.where.status) continue;
          const notId = (args.where.id as { not?: string } | undefined)?.not;
          if (notId && v.id === notId) continue;
          Object.assign(v, args.data);
          count += 1;
        }
        return { count };
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Partial<VersionRow> }) => {
        const v = store.versions.find((x) => x.id === args.where.id);
        if (!v) throw new Error("version not found");
        Object.assign(v, args.data);
        return v;
      }),
      create: vi.fn(async (args: { data: Omit<VersionRow, "id" | "createdAt"> & { id?: string } }) => {
        const row: VersionRow = {
          id: args.data.id ?? nextId("ver"),
          templateId: args.data.templateId,
          version: args.data.version,
          bodyEn: args.data.bodyEn,
          bodyAr: args.data.bodyAr,
          status: args.data.status,
          changeNote: args.data.changeNote ?? null,
          publishedAt: args.data.publishedAt ?? null,
          publishedBy: args.data.publishedBy ?? null,
          createdAt: new Date(),
        };
        store.versions.push(row);
        return row;
      }),
    },
    aiModelConfig: {
      updateMany: vi.fn(async (args: { where: Record<string, unknown>; data: Partial<ModelRow> }) => {
        let count = 0;
        for (const m of store.models) {
          if (args.where.feature && m.feature !== args.where.feature) continue;
          if (args.where.active !== undefined && m.active !== args.where.active) continue;
          Object.assign(m, args.data);
          count += 1;
        }
        return { count };
      }),
      create: vi.fn(async (args: { data: Omit<ModelRow, "id" | "createdAt" | "updatedAt"> }) => {
        const row: ModelRow = {
          id: nextId("model"),
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.models.push(row);
        return row;
      }),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      aiPromptTemplate: {
        upsert: vi.fn(
          async (args: {
            where: { feature: AiFeatureKey };
            create: { feature: AiFeatureKey; name: string };
            update: object;
          }) => {
            let t = store.templates.find((x) => x.feature === args.where.feature);
            if (!t) {
              t = { id: nextId("tpl"), feature: args.create.feature, name: args.create.name };
              store.templates.push(t);
            }
            return t;
          },
        ),
        findUnique: vi.fn(
          async (args: {
            where: { feature?: AiFeatureKey; id?: string };
            include?: { versions?: { where?: { status: AiPromptStatus }; orderBy?: object; take?: number } };
          }) => {
            const t = store.templates.find(
              (x) =>
                (args.where.feature && x.feature === args.where.feature) ||
                (args.where.id && x.id === args.where.id),
            );
            if (!t) return null;
            if (!args.include?.versions) return t;
            let versions = store.versions.filter((v) => v.templateId === t.id);
            if (args.include.versions.where?.status) {
              versions = versions.filter((v) => v.status === args.include!.versions!.where!.status);
            }
            versions = [...versions].sort((a, b) => b.version - a.version);
            if (args.include.versions.take) versions = versions.slice(0, args.include.versions.take);
            return { ...t, versions };
          },
        ),
        findMany: vi.fn(async () =>
          store.templates.map((t) => ({
            ...t,
            versions: store.versions
              .filter((v) => v.templateId === t.id)
              .sort((a, b) => b.version - a.version),
          })),
        ),
      },
      aiPromptVersion: {
        findFirst: vi.fn(
          async (args: {
            where: { templateId: string };
            orderBy: { version: string };
            select?: { version: true };
          }) => {
            const versions = store.versions
              .filter((v) => v.templateId === args.where.templateId)
              .sort((a, b) => b.version - a.version);
            const first = versions[0];
            if (!first) return null;
            return args.select ? { version: first.version } : first;
          },
        ),
        findUnique: vi.fn(
          async (args: {
            where: { id?: string; templateId_version?: { templateId: string; version: number } };
            include?: { template: true };
          }) => {
            let v: VersionRow | undefined;
            if (args.where.id) v = store.versions.find((x) => x.id === args.where.id);
            if (args.where.templateId_version) {
              v = store.versions.find(
                (x) =>
                  x.templateId === args.where.templateId_version!.templateId &&
                  x.version === args.where.templateId_version!.version,
              );
            }
            if (!v) return null;
            if (args.include?.template) {
              const template = store.templates.find((t) => t.id === v!.templateId)!;
              return { ...v, template };
            }
            return v;
          },
        ),
        create: tx.aiPromptVersion.create,
        update: tx.aiPromptVersion.update,
        updateMany: tx.aiPromptVersion.updateMany,
      },
      aiModelConfig: {
        findFirst: vi.fn(
          async (args: {
            where: { feature: AiFeatureKey; active?: boolean };
            orderBy: { version: string };
            select?: { version: true };
          }) => {
            let rows = store.models.filter((m) => m.feature === args.where.feature);
            if (args.where.active !== undefined) {
              rows = rows.filter((m) => m.active === args.where.active);
            }
            rows = [...rows].sort((a, b) => b.version - a.version);
            const first = rows[0];
            if (!first) return null;
            return args.select ? { version: first.version } : first;
          },
        ),
        findMany: vi.fn(async () =>
          [...store.models].sort((a, b) =>
            a.feature === b.feature ? b.version - a.version : a.feature.localeCompare(b.feature),
          ),
        ),
        create: tx.aiModelConfig.create,
        updateMany: tx.aiModelConfig.updateMany,
      },
    },
  };
});

import {
  __clearPromptCache,
  composeFeaturePrompt,
  getPublishedPrompt,
  publish,
  rollback,
  saveDraft,
} from "@/lib/ai/prompts";
import {
  __clearModelCache,
  listModelConfigs,
  resolveActiveConfig,
  saveModelConfig,
} from "@/lib/ai/models";

describe("prompt lifecycle management", () => {
  beforeEach(() => {
    resetStore();
    __clearPromptCache();
    vi.clearAllMocks();
  });

  it("draft → publish archives prior → compose uses new version → rollback clones", async () => {
    const actor = "admin-1";

    const v1 = await saveDraft({
      feature: "PATIENT_ASSISTANT",
      bodyEn: "v1 english",
      bodyAr: "v1 arabic",
      changeNote: "initial",
      actorUserId: actor,
    });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;

    const pub1 = await publish({ versionId: v1.data.versionId, actorUserId: actor });
    expect(pub1.ok).toBe(true);

    const composed1 = await composeFeaturePrompt("PATIENT_ASSISTANT", "en");
    expect(composed1.ok).toBe(true);
    if (!composed1.ok) return;
    expect(composed1.data.body).toBe("v1 english");
    expect(composed1.data.promptVersionId).toBe(v1.data.versionId);
    expect(composed1.data.safetyLayer.length).toBeGreaterThan(0);

    const v2 = await saveDraft({
      feature: "PATIENT_ASSISTANT",
      bodyEn: "v2 english tone",
      bodyAr: "v2 arabic tone",
      changeNote: "tone change",
      actorUserId: actor,
    });
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;

    // Live traffic still on v1 until publish
    const stillV1 = await getPublishedPrompt("PATIENT_ASSISTANT");
    expect(stillV1.ok).toBe(true);
    if (stillV1.ok) expect(stillV1.data.version.id).toBe(v1.data.versionId);

    const pub2 = await publish({ versionId: v2.data.versionId, actorUserId: actor });
    expect(pub2.ok).toBe(true);

    const archived = store.versions.find((v) => v.id === v1.data.versionId);
    expect(archived?.status).toBe("ARCHIVED");
    const live = store.versions.find((v) => v.id === v2.data.versionId);
    expect(live?.status).toBe("PUBLISHED");
    expect(store.versions.filter((v) => v.status === "PUBLISHED")).toHaveLength(1);

    // Cache invalidated on publish — new compose picks up v2 immediately
    const composed2 = await composeFeaturePrompt("PATIENT_ASSISTANT", "en");
    expect(composed2.ok).toBe(true);
    if (!composed2.ok) return;
    expect(composed2.data.body).toBe("v2 english tone");
    expect(composed2.data.promptVersionId).toBe(v2.data.versionId);
    expect(composed2.data.version).toBe(2);

    const templateId = store.templates[0]!.id;
    const rolled = await rollback({
      templateId,
      toVersion: 1,
      reason: "tone regressed",
      actorUserId: actor,
    });
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;

    expect(rolled.data.version).toBe(3);
    const clone = store.versions.find((v) => v.id === rolled.data.versionId);
    expect(clone?.status).toBe("PUBLISHED");
    expect(clone?.bodyEn).toBe("v1 english");
    expect(clone?.changeNote).toBe("tone regressed");
    expect(store.versions.find((v) => v.id === v2.data.versionId)?.status).toBe("ARCHIVED");
    expect(store.versions.filter((v) => v.status === "PUBLISHED")).toHaveLength(1);

    const afterRollback = await composeFeaturePrompt("PATIENT_ASSISTANT", "en");
    expect(afterRollback.ok).toBe(true);
    if (!afterRollback.ok) return;
    expect(afterRollback.data.body).toBe("v1 english");
    expect(afterRollback.data.promptVersionId).toBe(rolled.data.versionId);
  });
});

describe("model config management", () => {
  beforeEach(() => {
    resetStore();
    __clearModelCache();
    vi.clearAllMocks();
  });

  it("save bumps version and keeps exactly one active config per feature", async () => {
    const first = await saveModelConfig({
      feature: "PATIENT_ASSISTANT",
      provider: "STUB",
      modelName: "stub-v1",
      fallbackModel: "stub-fallback",
      temperature: 0.2,
      maxOutputTokens: 512,
      actorUserId: "admin-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.version).toBe(1);

    const second = await saveModelConfig({
      feature: "PATIENT_ASSISTANT",
      provider: "OPENAI",
      modelName: "gpt-4o-mini",
      fallbackModel: "gpt-4o-mini",
      temperature: 0.3,
      maxOutputTokens: 1024,
      actorUserId: "admin-1",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.version).toBe(2);

    const forFeature = store.models.filter((m) => m.feature === "PATIENT_ASSISTANT");
    expect(forFeature).toHaveLength(2);
    expect(forFeature.filter((m) => m.active)).toHaveLength(1);
    expect(forFeature.find((m) => m.active)?.id).toBe(second.data.id);
    expect(forFeature.find((m) => m.id === first.data.id)?.active).toBe(false);

    const active = await resolveActiveConfig("PATIENT_ASSISTANT");
    expect(active.ok).toBe(true);
    if (active.ok) {
      expect(active.data.id).toBe(second.data.id);
      expect(active.data.modelName).toBe("gpt-4o-mini");
    }

    const listed = await listModelConfigs();
    expect(listed[0]?.version).toBe(2);
    expect(listed[0]?.active).toBe(true);
  });
});
