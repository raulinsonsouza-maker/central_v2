import { NextResponse } from "next/server";
import { processScheduledExecutions } from "@/lib/instagram/automationEngine";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const processed = await processScheduledExecutions();
  return NextResponse.json({ processed });
}
