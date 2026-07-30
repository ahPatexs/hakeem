import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { prisma } from "@/lib/prisma";
import { localStorageAdapter } from "@/adapters/local-storage";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole("PATIENT");
    const { id } = await params;

    const document = await prisma.clinicalDocument.findFirst({
      where: { id, patientUserId: user.id },
    });

    if (!document) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const file = await localStorageAdapter.download(document.storageKey);
    await auditPhiAccess("phi.download.document", user.id, { documentId: id });

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
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error("[patient/documents]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
