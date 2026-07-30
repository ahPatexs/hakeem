import { NextResponse } from "next/server";
import { SESSION_COOKIE, REFRESH_COOKIE } from "@/auth/cookies";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";

/** Clear stale auth cookies so the user can reach /login without a redirect loop. */
export async function POST() {
  try {
    await assertSameOriginMutation();
  } catch (error) {
    if (isCsrfError(error)) {
      return NextResponse.json({ ok: false, code: "CSRF" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, code: "CSRF" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
