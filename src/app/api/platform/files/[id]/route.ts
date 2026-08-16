import { NextResponse } from "next/server";
import { verifyDownloadSignature, streamStoredFile } from "@/lib/platform/documents";
import { servePublicDoctorPhoto, servePublicPatientPhoto } from "@/lib/platform/image";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (id.startsWith("dphoto-")) {
      return servePublicDoctorPhoto(id.slice("dphoto-".length), request);
    }
    if (id.startsWith("pphoto-")) {
      return servePublicPatientPhoto(id.slice("pphoto-".length), request);
    }
    const url = new URL(request.url);
    const exp = Number(url.searchParams.get("exp"));
    const sig = url.searchParams.get("sig") ?? "";

    if (!verifyDownloadSignature(id, exp, sig)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const file = await streamStoredFile(id);
    if (!file.ok) {
      const status = file.code === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json({ error: file.code }, { status });
    }

    return new NextResponse(new Uint8Array(file.data.body), {
      status: 200,
      headers: {
        "Content-Type": file.data.contentType,
        "Content-Length": String(file.data.body.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${file.data.fileName}"`,
      },
    });
  } catch (error) {
    console.error("[platform/files]", error);
    return NextResponse.json({ error: "INTERNAL_FAILURE" }, { status: 500 });
  }
}
