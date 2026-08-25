import { NextRequest, NextResponse } from "next/server";
import {
  markRewardLinkClicked,
  parseLinkTrackingToken,
} from "@/lib/symbius/linkTracking";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = parseLinkTrackingToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
  }

  try {
    await markRewardLinkClicked({
      reminderExecId: payload.e,
      contatoId: payload.c,
      fluxoId: payload.f,
    });
  } catch (e) {
    console.warn("[symbius/go] click tracking failed:", e);
  }

  return NextResponse.redirect(payload.u, 302);
}
