import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

export const EMR_SEARCH_PAGE_SIZE = 20;

export type InChartSearchFilters = {
  q?: string;
  status?: string;
  type?: string;
  from?: Date | string;
  to?: Date | string;
  page?: number;
  /** When true, include soft-deleted rows (authorized restore/compliance views — T146). */
  includeDeleted?: boolean;
};

export type InChartSearchParams = {
  q?: string;
  status?: string;
  type?: string;
  from?: Date;
  to?: Date;
  page: number;
  skip: number;
  take: number;
};

function parseDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Normalize in-chart list filters (FR-048). Page size fixed at 20.
 * Callers must still enforce RBAC / release rules on the resulting query.
 */
export function inChartSearch(filters: InChartSearchFilters = {}): InChartSearchParams {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const q = filters.q?.trim() || undefined;
  return {
    q,
    status: filters.status?.trim() || undefined,
    type: filters.type?.trim() || undefined,
    from: parseDate(filters.from),
    to: parseDate(filters.to),
    page,
    skip: (page - 1) * EMR_SEARCH_PAGE_SIZE,
    take: EMR_SEARCH_PAGE_SIZE,
  };
}

/** Prisma-friendly contains filter when `q` is present. */
export function textContains(q: string | undefined): { contains: string; mode: "insensitive" } | undefined {
  if (!q) return undefined;
  return { contains: q, mode: "insensitive" };
}

export type AdminPatientSearchItem = {
  id: string;
  name: string | null;
  email: string;
};

export type AdminPatientSearchResult = {
  items: AdminPatientSearchItem[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * Cross-patient oversight directory search restricted to Admin (FR-036, T096).
 * Returns only id/name/email — no clinical PHI — and is always audited.
 */
export async function searchPatientsForAdmin(
  actor: EmrActor,
  input: { q?: string; page?: number } = {},
): Promise<PlatformResult<AdminPatientSearchResult>> {
  if (actor.role !== "ADMIN") {
    return platformFail("FORBIDDEN", "Admin oversight search only");
  }

  const search = inChartSearch(input);
  const contains = textContains(search.q);

  const where = {
    role: "PATIENT" as const,
    ...(contains ? { OR: [{ name: contains }, { email: contains }] } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: search.skip,
      take: search.take,
      select: { id: true, name: true, email: true },
    }),
  ]);

  await emrAudit({
    type: "admin.search",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    meta: { q: search.q ?? null, page: search.page, count: rows.length },
  });

  return platformOk({
    items: rows,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}
