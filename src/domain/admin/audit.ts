import type { Prisma } from "@prisma/client";

export type AuditListFilters = {
  type?: string;
  actorUserId?: string;
  targetUserId?: string;
  outcome?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export function buildAuditWhere(filters: AuditListFilters): Prisma.SecurityAuditEventWhereInput {
  const where: Prisma.SecurityAuditEventWhereInput = {};
  if (filters.type) where.type = { contains: filters.type };
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.targetUserId) where.targetUserId = filters.targetUserId;
  if (filters.outcome) where.outcome = filters.outcome as Prisma.EnumAuditOutcomeFilter;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  return where;
}
