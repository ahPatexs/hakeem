import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, requestMeta } from "@/actions/admin/_helpers";
import { getAnalyticsSeries } from "@/actions/admin/analytics";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import { isAuthDomainError } from "@/auth/errors";

export async function GET(request: NextRequest) {
  try {
    await assertSameOriginMutation();
    const admin = await requireAdminPermission("admin:analytics:read");
    const period = (request.nextUrl.searchParams.get("period") ?? "30d") as "7d" | "30d" | "90d";
    const result = await getAnalyticsSeries({ period });
    if (!result.ok) return NextResponse.json({ error: result.code }, { status: 400 });
    const d = result.data;
    const header = "metric,value\n";
    const body = [
      ["period", d.period],
      ["new_users", d.users],
      ["new_doctors", d.doctors],
      ["appointments", d.appointments],
      ["revenue_net_cents", d.revenueNetCents],
      ["ai_messages", d.aiMessages],
    ]
      .map(([k, v]) => `${k},${v}`)
      .join("\n");
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.exportAnalytics,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { period },
      ...(await requestMeta()),
    });
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="analytics-export.csv"',
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
