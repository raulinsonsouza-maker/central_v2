import { NextRequest, NextResponse } from "next/server";
import { getIntegrationsConfig, updateIntegrationsConfig } from "@/lib/config/integrations";

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getIntegrationsConfig();
    return NextResponse.json({
      metaAdAccountId: config.metaAdAccountId ?? "",
      hasMetaAccessToken: !!config.metaAccessToken,
      hasGoogleDeveloperToken: !!config.googleDeveloperToken,
      hasGoogleRefreshToken: !!config.googleRefreshToken,
      hasGoogleClientId: !!config.googleClientId,
      hasGoogleClientSecret: !!config.googleClientSecret,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    metaAccessToken?: string;
    metaAdAccountId?: string;
    googleDeveloperToken?: string;
    googleRefreshToken?: string;
    googleClientId?: string;
    googleClientSecret?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await updateIntegrationsConfig(body);
    const config = await getIntegrationsConfig();
    return NextResponse.json({
      ok: true,
      metaAdAccountId: config.metaAdAccountId ?? "",
      hasMetaAccessToken: !!config.metaAccessToken,
      hasGoogleDeveloperToken: !!config.googleDeveloperToken,
      hasGoogleRefreshToken: !!config.googleRefreshToken,
      hasGoogleClientId: !!config.googleClientId,
      hasGoogleClientSecret: !!config.googleClientSecret,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

