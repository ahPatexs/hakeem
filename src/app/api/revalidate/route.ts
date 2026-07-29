import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid secret" } },
      { status: 401 },
    );
  }

  let body: { tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const tags = body.tags?.filter((t) => typeof t === "string" && t.length > 0) ?? [];
  if (!tags.length) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "tags required" } },
      { status: 400 },
    );
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ ok: true, data: { revalidated: tags } });
}
