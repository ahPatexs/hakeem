import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAiActor } from "@/actions/ai/_actor";
import { isAuthDomainError } from "@/auth/errors";
import { assertSameOriginMutation, isCsrfError } from "@/auth/csrf";
import {
  streamChatTurn,
  type ChatFeature,
  type ChatStreamEvent,
} from "@/lib/ai/conversations";

export const runtime = "nodejs";

const bodySchema = z.object({
  conversationId: z.string().cuid().optional(),
  feature: z.enum(["PATIENT_ASSISTANT", "DOCTOR_SOAP", "DOCTOR_SUMMARY"]),
  patientUserId: z.string().cuid().optional(),
  appointmentId: z.string().cuid().optional(),
  message: z.string().min(1).max(4000),
  locale: z.enum(["en", "ar"]),
});

function encodeSse(event: ChatStreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    await assertSameOriginMutation();

    const actorResult = await resolveAiActor();
    if (!actorResult.ok) {
      return NextResponse.json({ error: actorResult.code }, { status: 401 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const actor = actorResult.data;
    const input = {
      conversationId: parsed.data.conversationId,
      feature: parsed.data.feature as ChatFeature,
      message: parsed.data.message,
      locale: parsed.data.locale,
      patientUserId: parsed.data.patientUserId,
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const evt of streamChatTurn(actor, input)) {
            controller.enqueue(encoder.encode(encodeSse(evt)));
            if (evt.event === "error" || evt.event === "done") break;
          }
        } catch (err) {
          console.error("[api/ai/chat]", err);
          controller.enqueue(
            encoder.encode(encodeSse({ event: "error", data: { code: "INTERNAL_FAILURE" } })),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
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
    console.error("[api/ai/chat]", error);
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
