import { NextResponse } from "next/server";
import { processDueJobs } from "@/lib/platform/jobs";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (request.headers.get("x-vercel-cron")) return true;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice("Bearer ".length) === cronSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  let limit = 25;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.max(1, Math.min(Math.floor(body.limit), 100));
    }
  } catch {
    // Empty body is allowed.
  }

  const result = await processDueJobs(limit);
  return NextResponse.json({ ok: true, data: result });
}
