const GRAPH = "https://graph.facebook.com/v21.0";

export function getSymbiusMetaConfig() {
  const appId =
    process.env.SYMBIUS_META_APP_ID ?? process.env.META_APP_ID ?? "";
  const appSecret =
    process.env.SYMBIUS_META_APP_SECRET ?? process.env.META_APP_SECRET ?? "";
  const verifyToken =
    process.env.SYMBIUS_META_WEBHOOK_VERIFY_TOKEN ??
    process.env.META_WEBHOOK_VERIFY_TOKEN ??
    "symbius-webhook-verify";

  return { appId, appSecret, verifyToken, graphBase: GRAPH };
}

export function getSymbiusAppUrl(): string {
  if (process.env.SYMBIUS_APP_URL) return process.env.SYMBIUS_APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return "http://localhost:5000";
}

export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "business_management",
].join(",");

export interface MetaPageOption {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string | null;
  pictureUrl?: string;
}

export interface MetaIgProfile {
  id: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export async function metaGraphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const sp = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}/${path}?${sp}`);
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok || (json as { error?: { message: string } }).error) {
    throw new Error(
      (json as { error?: { message: string } }).error?.message ?? `HTTP ${res.status}`,
    );
  }
  return json;
}

export async function fetchUserPages(userToken: string): Promise<MetaPageOption[]> {
  const data = await metaGraphGet<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
      picture?: { data?: { url?: string } };
    }>;
  }>("me/accounts", userToken, {
    fields: "id,name,access_token,instagram_business_account,picture",
    limit: "100",
  });

  return (data.data ?? []).map((p) => ({
    pageId: p.id,
    pageName: p.name,
    pageAccessToken: p.access_token,
    igUserId: p.instagram_business_account?.id ?? null,
    pictureUrl: p.picture?.data?.url,
  }));
}

export async function fetchIgProfile(
  igUserId: string,
  pageToken: string,
): Promise<MetaIgProfile> {
  return metaGraphGet<MetaIgProfile>(igUserId, pageToken, {
    fields: "username,profile_picture_url,followers_count",
  });
}

export async function subscribePageWebhooks(
  pageId: string,
  pageToken: string,
): Promise<void> {
  const sp = new URLSearchParams({
    subscribed_fields:
      "messages,messaging_postbacks,messaging_referrals,message_echoes,comments",
    access_token: pageToken,
  });
  const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps?${sp}`, {
    method: "POST",
  });
  const json = (await res.json()) as { success?: boolean; error?: { message: string } };
  if (!res.ok || json.error || json.success === false) {
    throw new Error(json.error?.message ?? "Falha ao assinar webhooks");
  }
}

export async function verifyMessagingAccess(
  igUserId: string,
  pageToken: string,
): Promise<boolean> {
  try {
    await metaGraphGet(`${igUserId}/conversations`, pageToken, { limit: "1" });
    return true;
  } catch {
    return false;
  }
}

export function buildMetaOAuthUrl(state: string): string {
  const { appId } = getSymbiusMetaConfig();
  const redirectUri = `${getSymbiusAppUrl()}/api/symbius/auth/meta/callback`;
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const { appId, appSecret } = getSymbiusMetaConfig();
  const redirectUri = `${getSymbiusAppUrl()}/api/symbius/auth/meta/callback`;
  const sp = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${sp}`);
  const json = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!json.access_token) {
    throw new Error(json.error?.message ?? "Token exchange failed");
  }
  return json.access_token;
}
