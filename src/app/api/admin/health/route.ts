import { NextResponse } from "next/server";
import { getSystemHealth } from "@/actions/admin/health";

export async function GET() {
  const result = await getSystemHealth();
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: 403 });
  return NextResponse.json(result.data);
}
