import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/symbius/auth";
import { buildMetaOAuthUrl } from "@/lib/instagram/metaOAuth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: session.organizationId,
      userId: session.userId,
      ts: Date.now(),
      returnTo: request.nextUrl.searchParams.get("returnTo") ?? "/app/connect",
    }),
  ).toString("base64url");

  const jar = await cookies();
  jar.set("symbius_meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildMetaOAuthUrl(state));
}
