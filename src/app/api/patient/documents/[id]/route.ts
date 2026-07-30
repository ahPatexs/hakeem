import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { assertFileAccess, resolveStoredFile, streamStoredFile } from "@/lib/platform/documents";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole("PATIENT");
    const { id } = await params;

    const file = await resolveStoredFile(id);
    if (!file || file.patientUserId !== user.id) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const allowed = await assertFileAccess(user.id, "PATIENT", file);
    if (!allowed) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const streamed = await streamStoredFile(id);
    if (!streamed.ok) {
      const status = streamed.code === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json({ error: streamed.code }, { status });
    }

    await auditPhiAccess("phi.download.document", user.id, { documentId: id });

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
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error("[patient/documents]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
