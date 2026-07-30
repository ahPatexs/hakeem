import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { prisma } from "@/lib/prisma";
import { localStorageAdapter } from "@/adapters/local-storage";
import { requireDoctorContext, isDoctorContextError } from "@/lib/doctor/context";
import { assertCareRelationship } from "@/domain/doctor/care-relationship";
import { DomainRuleError } from "@/domain/doctor/errors";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("DOCTOR");
    const ctx = await requireDoctorContext();
    const { id } = await params;

    const document = await prisma.clinicalDocument.findFirst({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await assertCareRelationship(ctx.doctorId, document.patientUserId);

    const file = await localStorageAdapter.download(document.storageKey);
    await auditDoctorEvent(
      "doctor.doc.download",
      ctx.userId,
      { documentId: id },
      document.patientUserId,
    );

    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.byteSize),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
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
