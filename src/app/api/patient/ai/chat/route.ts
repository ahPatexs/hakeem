import { NextResponse } from "next/server";

/**
 * @deprecated Legacy patient AI chat. Use POST `/api/ai/chat` (Module 7) instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "GONE",
      message: "Legacy patient AI chat is retired. Use POST /api/ai/chat with feature PATIENT_ASSISTANT.",
    },
    { status: 410 },
  );
}
