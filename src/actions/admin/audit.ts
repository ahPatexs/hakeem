"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, withAdminPermission, type AdminActionResult } from "@/actions/admin/_helpers";
import { buildAuditWhere } from "@/domain/admin/audit";

export async function listAuditEvents(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      type: string;
      outcome: string;
      actorEmail: string | null;
      targetEmail: string | null;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:audit:read", async () => {
    const parsed = z
      .object({
        type: z.string().optional(),
        outcome: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const where = buildAuditWhere({
      type: parsed.data.type,
      outcome: parsed.data.outcome,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
    });
    const [rows, total] = await Promise.all([
      prisma.securityAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          actor: { select: { email: true } },
          target: { select: { email: true } },
        },
      }),
      prisma.securityAuditEvent.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        outcome: r.outcome,
        actorEmail: r.actor?.email ?? null,
        targetEmail: r.target?.email ?? null,
        createdAt: r.createdAt,
      })),
      total,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
    };
  });
}
