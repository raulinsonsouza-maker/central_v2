import { NextRequest, NextResponse } from "next/server";
import { getIntegrationsConfig, updateIntegrationsConfig } from "@/lib/config/integrations";

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

function buildResponse(config: Awaited<ReturnType<typeof getIntegrationsConfig>>) {
  return {
    metaAdAccountId: config.metaAdAccountId ?? "",
    hasMetaAccessToken: !!config.metaAccessToken,
    hasGoogleDeveloperToken: !!config.googleDeveloperToken,
    hasGoogleRefreshToken: !!config.googleRefreshToken,
    hasGoogleClientId: !!config.googleClientId,
    hasGoogleClientSecret: !!config.googleClientSecret,
    googleLoginCustomerId: config.googleLoginCustomerId ?? "",
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getIntegrationsConfig();
    return NextResponse.json(buildResponse(config));
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
    googleLoginCustomerId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await updateIntegrationsConfig(body);
    const config = await getIntegrationsConfig();
    return NextResponse.json({ ok: true, ...buildResponse(config) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
