"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { PushDevicePlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { platformAudit } from "@/lib/platform/audit";

const registerSchema = z.object({
  token: z.string().min(16).max(4096),
  platform: z.enum(["WEB", "IOS", "ANDROID"]).default("WEB"),
});

const revokeSchema = z.object({
  token: z.string().min(16).max(4096),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerPushDevice(raw: unknown) {
  try {
    const user = await requireRole("PATIENT", "DOCTOR", "ADMIN");
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" as const };

    const tokenHash = hashToken(parsed.data.token);
    const platform = parsed.data.platform as PushDevicePlatform;

    await prisma.pushDeviceRegistration.upsert({
      where: { userId_tokenHash: { userId: user.id, tokenHash } },
      create: {
        userId: user.id,
        tokenHash,
        platform,
        lastSeenAt: new Date(),
      },
      update: {
        platform,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
    });

    await platformAudit({
      type: "platform.push.register",
      outcome: "SUCCESS",
      actorUserId: user.id,
      meta: { platform },
    });

    return { ok: true as const };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "UNKNOWN" as const };
  }
}

export async function revokePushDevice(raw: unknown) {
  try {
    const user = await requireRole("PATIENT", "DOCTOR", "ADMIN");
    const parsed = revokeSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" as const };

    const tokenHash = hashToken(parsed.data.token);
    await prisma.pushDeviceRegistration.updateMany({
      where: { userId: user.id, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await platformAudit({
      type: "platform.push.revoke",
      outcome: "SUCCESS",
      actorUserId: user.id,
    });

    return { ok: true as const };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "UNKNOWN" as const };
  }
}
