import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshCredential } from "@/auth/refresh";
import { createUserSession } from "@/auth/session";
import { prisma } from "@/lib/prisma";
import { REFRESH_COOKIE, SESSION_COOKIE, refreshCookieOptions, sessionCookieOptions } from "@/auth/cookies";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    await assertSameOriginMutation();
  } catch (error) {
    if (isCsrfError(error)) {
      return NextResponse.json({ ok: false, code: "CSRF" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, code: "CSRF" }, { status: 403 });
  }

  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!raw) {
    const res = NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
    // Stale session cookie alone must not trap the user in a login↔expired loop.
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const rotated = await rotateRefreshCredential(raw);
  if (!rotated) {
    const res = NextResponse.json({ ok: false, code: "SESSION_EXPIRED" }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
  if (!user || user.status !== "ACTIVE") {
    const res = NextResponse.json({ ok: false, code: "ACCOUNT_INACTIVE" }, { status: 403 });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const session = await createUserSession({
    userId: user.id,
    role: user.role,
    rememberMe: true,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.sessionToken, sessionCookieOptions(30 * 24 * 60 * 60));
  res.cookies.set(REFRESH_COOKIE, rotated.raw, refreshCookieOptions());
  return res;
}
