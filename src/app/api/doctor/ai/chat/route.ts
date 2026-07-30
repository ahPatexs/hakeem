import { NextResponse } from "next/server";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import { prisma } from "@/lib/prisma";
import { requireDoctorContext, isDoctorContextError } from "@/lib/doctor/context";
import { doctorAiSendSchema } from "@/lib/doctor/schemas";
import { AI_RATE_LIMIT_PER_HOUR } from "@/domain/doctor/dashboard";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { DomainRuleError } from "@/domain/doctor/errors";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

const MODE_PROMPTS: Record<string, string> = {
  MEDICAL: "Clinical decision-support assistant. Advisory only; the physician retains full responsibility.",
  DOCUMENTATION: "Draft clinical documentation (SOAP) from the encounter context. Output is a draft requiring physician review.",
  PRESCRIPTION: "Draft prescription suggestions. Never authoritative; physician must review and sign.",
};

export async function POST(request: Request) {
  try {
    await assertSameOriginMutation();
    await requireRole("DOCTOR");
    const ctx = await requireDoctorContext();

    const { assertAiAllowed, chat } = await import("@/lib/platform/ai");

    const json = await request.json();
    const parsed = doctorAiSendSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    const input = parsed.data;

    const aiFeature =
      input.mode === "PRESCRIPTION"
        ? "doctorPrescription"
        : input.mode === "DOCUMENTATION"
          ? "doctorDocumentation"
          : "doctorDocumentation";
    if (!(await assertAiAllowed(ctx.userId, aiFeature))) {
      return NextResponse.json({ error: "AI_DISABLED" }, { status: 403 });
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.doctorAiMessage.count({
      where: {
        role: "user",
        createdAt: { gte: hourAgo },
        conversation: { doctorUserId: ctx.userId },
      },
    });
    if (recentCount >= AI_RATE_LIMIT_PER_HOUR) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    if (input.patientUserId) {
      const allowed = await hasCareRelationship(ctx.doctorId, input.patientUserId);
      if (!allowed) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    }

    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const locale = acceptLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";

    let conversation;
    if (input.conversationId) {
      conversation = await prisma.doctorAiConversation.findFirst({
        where: { id: input.conversationId, doctorUserId: ctx.userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      });
      if (!conversation) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
    } else {
      conversation = await prisma.doctorAiConversation.create({
        data: {
          doctorUserId: ctx.userId,
          mode: input.mode,
          patientUserId: input.patientUserId ?? null,
          appointmentId: input.appointmentId ?? null,
          locale: locale === "ar" ? "AR" : "EN",
        },
        include: { messages: true },
      });
    }

    await prisma.doctorAiMessage.create({
      data: { conversationId: conversation.id, role: "user", content: input.content },
    });

    const history = [
      { role: "system" as const, content: MODE_PROMPTS[input.mode] },
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input.content },
    ];

    const result = await chat({
      conversationId: conversation.id,
      messages: history,
      locale,
      userId: ctx.userId,
      feature: aiFeature,
    });

    if (!result.ok) {
      const status =
        result.code === "FORBIDDEN" ? 403 : result.code === "RATE_LIMITED" ? 429 : 503;
      return NextResponse.json({ error: result.code, message: result.message }, { status });
    }

    await prisma.doctorAiMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: result.data.content },
    });
    await prisma.doctorAiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await auditDoctorEvent("doctor.ai.generate", ctx.userId, {
      conversationId: conversation.id,
      mode: input.mode,
      patientUserId: input.patientUserId ?? null,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result.data.content));
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Conversation-Id": conversation.id,
        ...(result.data.disclaimer ? { "X-Ai-Disclaimer": result.data.disclaimer } : {}),
      },
    });
  } catch (error) {
    if (isCsrfError(error)) {
      return NextResponse.json({ error: "CSRF" }, { status: 403 });
    }
    if (isAuthDomainError(error)) {
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "FORBIDDEN" ? 403 : 401 },
      );
    }
    if (isDoctorContextError(error)) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof DomainRuleError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    console.error("[doctor/ai/chat]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
