import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, requestMeta } from "@/actions/admin/_helpers";
import { EXPORT_ROW_CAP } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { assertExportCap } from "@/domain/admin/analytics";
import { STUCK_PROCESSING_MS } from "@/domain/billing/constants";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import { isAuthDomainError } from "@/auth/errors";
import type { PaymentStatus } from "@prisma/client";

const STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
] as const;

export async function GET(request: NextRequest) {
  try {
    await assertSameOriginMutation();
    const admin = await requireAdminPermission("admin:billing:read");
    const sp = request.nextUrl.searchParams;
    const statusRaw = sp.get("status");
    const stuck = sp.get("stuck") === "1";
    const fromRaw = sp.get("from");
    const toRaw = sp.get("to");
    const where: {
      status?: PaymentStatus;
      processingStartedAt?: { lte: Date };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (statusRaw && STATUSES.includes(statusRaw as (typeof STATUSES)[number])) {
      where.status = statusRaw as PaymentStatus;
    }
    if (stuck) {
      where.status = "PROCESSING";
      where.processingStartedAt = { lte: new Date(Date.now() - STUCK_PROCESSING_MS) };
    }
    if (fromRaw || toRaw) {
      where.createdAt = {};
      if (fromRaw) where.createdAt.gte = new Date(fromRaw);
      if (toRaw) {
        const lte = new Date(toRaw);
        lte.setHours(23, 59, 59, 999);
        where.createdAt.lte = lte;
      }
    }
    const rows = await prisma.paymentObligation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: EXPORT_ROW_CAP + 1,
      include: { patient: { select: { email: true } } },
    });
    assertExportCap(rows.length);
    const limited = rows.slice(0, EXPORT_ROW_CAP);
    const header = "id,invoiceNumber,description,amountCents,status,patientEmail,createdAt\n";
    const body = limited
      .map((r) =>
        [
          r.id,
          r.invoiceNumber ?? "",
          r.description,
          r.amountCents,
          r.status,
          r.patient.email,
          r.createdAt.toISOString(),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.exportAudit,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { export: "billing", rowCount: limited.length },
      ...(await requestMeta()),
    });
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="billing-export.csv"',
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
