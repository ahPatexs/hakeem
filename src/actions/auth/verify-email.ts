"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeChallenge, createChallenge, countRecentChallenges } from "@/auth/tokens";
import { rateLimitEmailSend, hashIp } from "@/auth/rate-limit";
import { sendAuthEmail } from "@/auth/email";
import { auditLog } from "@/auth/audit";
import { isAuthDomainError, AuthDomainError } from "@/auth/errors";
import { headers } from "next/headers";

const tokenSchema = z.object({ token: z.string().min(16) });
const resendSchema = z.object({
  email: z.string().email(),
  locale: z.enum(["en", "ar"]).optional(),
});

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string };

async function meta() {
  const h = await headers();
  return {
    ipHash: hashIp(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")),
    userAgent: h.get("user-agent"),
  };
}

export async function verifyEmail(input: unknown): Promise<ActionResult> {
  const parsed = tokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  try {
    const challenge = await consumeChallenge({
      rawToken: parsed.data.token,
      kind: "EMAIL_VERIFY",
    });
    const user = await prisma.user.findFirst({
      where: { email: challenge.email },
    });
    if (!user) throw new AuthDomainError("TOKEN_INVALID");
    if (user.role === "DOCTOR" && user.doctorApproval !== "APPROVED") {
      throw new AuthDomainError("DOCTOR_NOT_APPROVED");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: "ACTIVE",
      },
    });

    await auditLog({
      type: "auth.email_verify.success",
      outcome: "SUCCESS",
      actorUserId: user.id,
      ...(await meta()),
    });

    return { ok: true, message: "Email verified. You can sign in." };
  } catch (error) {
    await auditLog({
      type: "auth.email_verify.failure",
      outcome: "FAILURE",
      ...(await meta()),
      meta: { code: isAuthDomainError(error) ? error.code : "unknown" },
    });
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "TOKEN_INVALID" };
  }
}

export async function resendVerificationEmail(input: unknown): Promise<ActionResult> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  const email = parsed.data.email.toLowerCase();
  try {
    rateLimitEmailSend(email, "EMAIL_VERIFY");
    const recent = await countRecentChallenges(email, "EMAIL_VERIFY", 60 * 60 * 1000);
    if (recent >= 5) throw new AuthDomainError("RATE_LIMITED");

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === "PENDING_VERIFICATION") {
      const { rawToken } = await createChallenge({
        email,
        kind: "EMAIL_VERIFY",
        userId: user.id,
      });
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const locale = parsed.data.locale ?? "ar";
      const verifyUrl = `${site}/${locale}/verify-email?token=${rawToken}`;
      await sendAuthEmail({
        to: email,
        subject: "Verify your Hakeem account",
        text: `Verify your email: ${verifyUrl}`,
      });
    }
    return { ok: true, message: "If an account needs verification, a new email was sent." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "RATE_LIMITED" };
  }
}
