import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { requireDoctorContext, isDoctorContextError } from "@/lib/doctor/context";
import { DomainRuleError } from "@/domain/doctor/errors";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import { assertFileAccess, resolveStoredFile, streamStoredFile } from "@/lib/platform/documents";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("DOCTOR");
    const ctx = await requireDoctorContext();
    const { id } = await params;

    const file = await resolveStoredFile(id);
    if (!file) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const allowed = await assertFileAccess(ctx.userId, "DOCTOR", file, ctx.doctorId);
    if (!allowed) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const streamed = await streamStoredFile(id);
    if (!streamed.ok) {
      const status = streamed.code === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json({ error: streamed.code }, { status });
    }

    await auditDoctorEvent(
      "doctor.doc.download",
      ctx.userId,
      { documentId: id },
      file.patientUserId,
    );

    return new NextResponse(new Uint8Array(streamed.data.body), {
      status: 200,
      headers: {
        "Content-Type": streamed.data.contentType,
        "Content-Length": String(streamed.data.body.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${encodeURIComponent(streamed.data.fileName)}"`,
      },
    });
  } catch (error) {
    if (isAuthDomainError(error)) {
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "FORBIDDEN" ? 403 : 401 },
      );
    }
    if (isDoctorContextError(error)) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof DomainRuleError) {
      return NextResponse.json({ error: error.code }, { status: 404 });
    }
    console.error("[doctor/documents]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
