import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, requestMeta } from "@/actions/admin/_helpers";
import { EXPORT_ROW_CAP } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { assertExportCap } from "@/domain/admin/analytics";
import { buildAuditWhere } from "@/domain/admin/audit";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import { isAuthDomainError } from "@/auth/errors";

export async function GET(request: NextRequest) {
  try {
    await assertSameOriginMutation();
    const admin = await requireAdminPermission("admin:audit:read");
    const sp = request.nextUrl.searchParams;
    const type = sp.get("type") ?? undefined;
    const actorUserId = sp.get("actorUserId") ?? undefined;
    const outcome = sp.get("outcome") ?? undefined;
    const fromRaw = sp.get("from");
    const toRaw = sp.get("to");
    const where = buildAuditWhere({
      type,
      actorUserId,
      outcome: outcome ?? undefined,
      from: fromRaw ? new Date(fromRaw) : undefined,
      to: toRaw ? new Date(toRaw) : undefined,
    });
    const rows = await prisma.securityAuditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: EXPORT_ROW_CAP + 1,
      include: {
        actor: { select: { email: true } },
        target: { select: { email: true } },
      },
    });
    assertExportCap(rows.length);
    const limited = rows.slice(0, EXPORT_ROW_CAP);
    const header = "id,type,outcome,actorEmail,targetEmail,createdAt\n";
    const body = limited
      .map((r) =>
        [r.id, r.type, r.outcome, r.actor?.email ?? "", r.target?.email ?? "", r.createdAt.toISOString()]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.exportAudit,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { rowCount: limited.length, filters: { type, actorUserId, outcome, from: fromRaw, to: toRaw } },
      ...(await requestMeta()),
    });
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-export.csv"',
      },
    });
  } catch (error) {
    if (isCsrfError(error)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    if (isAuthDomainError(error)) {
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
}
