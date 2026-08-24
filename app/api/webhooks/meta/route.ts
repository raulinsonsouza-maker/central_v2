import { NextRequest, NextResponse } from "next/server";
import { getSymbiusMetaConfig } from "@/lib/instagram/metaOAuth";
import {
  processWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/instagram/automationEngine";

export async function GET(request: NextRequest) {
  const { verifyToken } = getSymbiusMetaConfig();
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    await processWebhookPayload(payload);
  } catch (e) {
    console.error("[webhook/meta]", e);
  }

  return NextResponse.json({ ok: true });
}
