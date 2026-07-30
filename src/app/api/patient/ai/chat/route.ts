import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: Request) {
  try {
    await assertSameOriginMutation();
    const user = await requireRole("PATIENT");

    const { assertAiAllowed, chat } = await import("@/lib/platform/ai");
    if (!(await assertAiAllowed(user.id, "patient"))) {
      return NextResponse.json({ error: "AI_DISABLED" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: parsed.data.conversationId, patientUserId: user.id },
    });
    if (!conversation) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const result = await chat({
      conversationId: parsed.data.conversationId,
      messages: parsed.data.messages,
      locale: parsed.data.locale,
      userId: user.id,
      feature: "patient",
    });

    if (!result.ok) {
      const status =
        result.code === "FORBIDDEN" ? 403 : result.code === "VALIDATION_ERROR" ? 400 : 503;
      return NextResponse.json({ error: result.code, message: result.message }, { status });
    }

    return NextResponse.json({
      content: result.data.content,
      disclaimer: result.data.disclaimer,
    });
  } catch (error) {
    if (isCsrfError(error)) {
      return NextResponse.json({ error: "CSRF" }, { status: 403 });
    }
    if (isAuthDomainError(error)) {
      return NextResponse.json({ error: error.code }, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error("[patient/ai/chat]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
