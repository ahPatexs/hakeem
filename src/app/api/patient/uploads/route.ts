import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { uploadPatientFile } from "@/lib/platform/storage";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

export async function POST(request: Request) {
  try {
    const user = await requireRole("PATIENT");
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const purpose = (form.get("purpose") as string) || "other";

    const result = await uploadPatientFile({
      userId: user.id,
      file: buffer,
      fileName: file.name,
      contentType: file.type,
      purpose,
    });

    if (!result.ok) {
      const status =
        result.code === "VALIDATION_ERROR"
          ? 400
          : result.code === "FORBIDDEN"
            ? 403
            : 500;
      return NextResponse.json({ error: result.code, message: result.message }, { status });
    }

    await auditPhiAccess("phi.upload", user.id, { uploadId: result.data.uploadId });

    return NextResponse.json({
      ok: true,
      uploadId: result.data.uploadId,
      scanStatus: result.data.scanStatus,
    });
  } catch (error) {
    if (isAuthDomainError(error)) {
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error("[patient/uploads]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
