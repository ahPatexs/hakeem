import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { prisma } from "@/lib/prisma";
import { localStorageAdapter } from "@/adapters/local-storage";
import { stubMalwareScanAdapter } from "@/adapters/stub-malware";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
  try {
    const user = await requireRole("PATIENT");
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const scan = await stubMalwareScanAdapter.scan({
      buffer,
      fileName: file.name,
      contentType: file.type,
    });

    if (scan.status === "rejected") {
      return NextResponse.json({ error: "MALWARE_REJECTED" }, { status: 400 });
    }

    const storageKey = `patient/${user.id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await localStorageAdapter.upload({
      key: storageKey,
      body: buffer,
      contentType: file.type,
    });

    const purpose = (form.get("purpose") as string) || "other";
    const upload = await prisma.patientUpload.create({
      data: {
        patientUserId: user.id,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        storageKey,
        scanStatus: "CLEAN",
        purpose,
      },
    });

    await auditPhiAccess("phi.upload", user.id, { uploadId: upload.id });

    return NextResponse.json({ ok: true, uploadId: upload.id });
  } catch (error) {
    if (isAuthDomainError(error)) {
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error("[patient/uploads]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
