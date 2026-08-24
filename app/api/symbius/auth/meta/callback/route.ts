import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSymbiusAppUrl } from "@/lib/instagram/metaOAuth";
import { exchangeCodeForToken, fetchUserPages } from "@/lib/instagram/metaOAuth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error_description");

  const base = getSymbiusAppUrl();
  if (error) {
    return NextResponse.redirect(
      `${base}/app/connect?error=${encodeURIComponent(error)}`,
    );
  }

  const jar = await cookies();
  const savedState = jar.get("symbius_meta_oauth_state")?.value;
  jar.delete("symbius_meta_oauth_state");

  if (!code || !stateParam || stateParam !== savedState) {
    return NextResponse.redirect(
      `${base}/app/connect?error=${encodeURIComponent("Sessão OAuth inválida")}`,
    );
  }

  try {
    const userToken = await exchangeCodeForToken(code);
    const pages = await fetchUserPages(userToken);
    const withIg = pages.filter((p) => p.igUserId);

    jar.set(
      "symbius_meta_pages",
      Buffer.from(JSON.stringify({ pages: withIg, userToken })).toString("base64url"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 1800,
      },
    );

    let returnTo = "/app/connect";
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf8"),
      ) as { returnTo?: string };
      if (decoded.returnTo) returnTo = decoded.returnTo;
    } catch {
      /* ignore */
    }

    return NextResponse.redirect(`${base}${returnTo}?step=2`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro OAuth";
    return NextResponse.redirect(
      `${base}/app/connect?error=${encodeURIComponent(msg)}`,
    );
  }
}
