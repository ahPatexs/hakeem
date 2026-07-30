"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordPolicy } from "@/auth/passwords";
import { createChallenge, countRecentChallenges } from "@/auth/tokens";
import { rateLimitEmailSend, hashIp } from "@/auth/rate-limit";
import { sendAuthEmail } from "@/auth/email";
import { auditLog } from "@/auth/audit";
import { AuthDomainError, isAuthDomainError } from "@/auth/errors";
import { headers } from "next/headers";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(128),
  locale: z.enum(["en", "ar"]).optional(),
});

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; fieldErrors?: Record<string, string[]> };

async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  return {
    ipHash: hashIp(ip),
    userAgent: h.get("user-agent"),
  };
}

export async function registerPatient(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const meta = await requestMeta();

  try {
    validatePasswordPolicy(parsed.data.password, email);
    rateLimitEmailSend(email, "EMAIL_VERIFY");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Anti-enumeration: identical success path
      await auditLog({
        type: "auth.register",
        outcome: "SUCCESS",
        meta: { duplicate: true },
        ...meta,
      });
      return { ok: true, message: "Check your email to verify your account." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        role: "PATIENT",
        status: "PENDING_VERIFICATION",
        localePreference: parsed.data.locale === "en" ? "EN" : "AR",
      },
    });

    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash },
    });

    const recent = await countRecentChallenges(email, "EMAIL_VERIFY", 60 * 60 * 1000);
    if (recent >= 5) throw new AuthDomainError("RATE_LIMITED");

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
      html: `<p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    await auditLog({
      type: "auth.register",
      outcome: "SUCCESS",
      actorUserId: user.id,
      ...meta,
    });

    return { ok: true, message: "Check your email to verify your account." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    console.error(error);
    return { ok: false, code: "VALIDATION_ERROR" };
  }
}
