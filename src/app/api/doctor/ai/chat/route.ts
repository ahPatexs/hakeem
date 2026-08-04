import { NextResponse } from "next/server";

/**
 * @deprecated Legacy doctor AI chat. Use POST `/api/ai/chat` (Module 7) instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "GONE",
      message: "Legacy doctor AI chat is retired. Use POST /api/ai/chat with feature DOCTOR_SOAP.",
    },
    { status: 410 },
  );
}
