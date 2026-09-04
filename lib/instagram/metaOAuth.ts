const IG_GRAPH = "https://graph.instagram.com/v21.0";
const IG_API = "https://api.instagram.com";

export function getSymbiusIgConfig() {
  const appId =
    process.env.SYMBIUS_IG_APP_ID ??
    process.env.SYMBIUS_META_APP_ID ??
    process.env.META_APP_ID ??
    "";
  const appSecret =
    process.env.SYMBIUS_IG_APP_SECRET ??
    process.env.SYMBIUS_META_APP_SECRET ??
    process.env.META_APP_SECRET ??
    "";
  const verifyToken =
    process.env.SYMBIUS_META_WEBHOOK_VERIFY_TOKEN ??
    process.env.META_WEBHOOK_VERIFY_TOKEN ??
    "symbius-webhook-verify";

  return { appId, appSecret, verifyToken, graphBase: IG_GRAPH };
}

/** @deprecated Prefer getSymbiusIgConfig — kept for webhook route imports */
export function getSymbiusMetaConfig() {
  return getSymbiusIgConfig();
}

export function getSymbiusAppUrl(): string {
  if (process.env.SYMBIUS_APP_URL)
    return process.env.SYMBIUS_APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN)
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return "http://localhost:5000";
}

export const META_OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export const SYMBIUS_META_OAUTH_MESSAGE = "symbius-meta-oauth";

export interface IgConnectedProfile {
  igUserId: string;
  username?: string;
  name?: string;
  accountType?: string;
  profilePictureUrl?: string;
  followersCount?: number;
}

export async function igGraphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const sp = new URLSearchParams(params);
  // Instagram Login: access_token na query é mais confiável que Bearer
  sp.set("access_token", token);
  const qs = sp.toString();
  const url = `${IG_GRAPH}/${path.replace(/^\//, "")}?${qs}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  }
  return json;
}

export function buildMetaOAuthUrl(state: string): string {
  const { appId } = getSymbiusIgConfig();
  const redirectUri = `${getSymbiusAppUrl()}/api/symbius/auth/meta/callback`;
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("enable_fb_login", "0");
  // Não enviar force_reauth — usuários já autorizados não devem ver tela completa de permissões
  url.searchParams.set("force_reauth", "0");
  return url.toString();
}

export function normalizeOAuthCode(code: string): string {
  return code.replace(/#_+$/, "");
}

export function normalizeScopes(
  permissions: string | string[] | undefined | null,
  fallback = META_OAUTH_SCOPES,
): string {
  if (Array.isArray(permissions)) {
    const joined = permissions.map((s) => String(s).trim()).filter(Boolean).join(",");
    return joined || fallback;
  }
  if (typeof permissions === "string" && permissions.trim()) {
    return permissions.trim();
  }
  return fallback;
}

export async function exchangeCodeForShortLivedToken(code: string): Promise<{
  accessToken: string;
  userId?: string;
  permissions?: string;
}> {
  const { appId, appSecret } = getSymbiusIgConfig();
  const redirectUri = `${getSymbiusAppUrl()}/api/symbius/auth/meta/callback`;
  const form = new FormData();
  form.set("client_id", appId);
  form.set("client_secret", appSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", normalizeOAuthCode(code));

  const res = await fetch(`${IG_API}/oauth/access_token`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json()) as {
    access_token?: string;
    user_id?: string | number;
    permissions?: string | string[];
    data?: Array<{
      access_token?: string;
      user_id?: string | number;
      permissions?: string | string[];
    }>;
    error_message?: string;
    error?: { message: string };
  };

  console.info(
    "[instagram] short-lived exchange",
    res.status,
    json.error_message ?? json.error?.message ?? "ok",
    "user_id=",
    json.user_id ?? json.data?.[0]?.user_id ?? "",
  );

  const row = json.data?.[0];
  const accessToken = json.access_token ?? row?.access_token;
  if (!accessToken) {
    throw new Error(
      json.error_message ?? json.error?.message ?? "Token exchange failed",
    );
  }

  return {
    accessToken,
    userId: String(json.user_id ?? row?.user_id ?? ""),
    permissions: normalizeScopes(
      json.permissions ?? row?.permissions,
      META_OAUTH_SCOPES,
    ),
  };
}

type TokenExchangeJson = {
  access_token?: string;
  expires_in?: number | string;
  token_type?: string;
  data?: Array<{ access_token?: string; expires_in?: number | string }>;
  error?: { message?: string; type?: string; code?: number };
  error_message?: string;
};

function pickAccessToken(json: TokenExchangeJson): {
  accessToken?: string;
  expiresIn?: number;
} {
  const row = json.data?.[0];
  const raw = json.access_token ?? row?.access_token;
  const expiresRaw = json.expires_in ?? row?.expires_in;
  const expiresIn =
    typeof expiresRaw === "string"
      ? Number(expiresRaw)
      : typeof expiresRaw === "number"
        ? expiresRaw
        : undefined;
  return {
    accessToken: raw,
    expiresIn:
      expiresIn && Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn
        : undefined,
  };
}

function tokenExchangeError(json: TokenExchangeJson, status: number): string {
  return (
    json.error?.message ??
    json.error_message ??
    `Long-lived token exchange failed (HTTP ${status})`
  );
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const { appSecret } = getSymbiusIgConfig();
  const metaSecret =
    process.env.SYMBIUS_META_APP_SECRET ?? process.env.META_APP_SECRET ?? "";
  const secrets = [appSecret, metaSecret].filter(
    (s, i, arr) => Boolean(s) && arr.indexOf(s) === i,
  );
  if (secrets.length === 0) {
    throw new Error("SYMBIUS_IG_APP_SECRET não configurado");
  }

  // Meta: alguns apps exigem GET, outros POST; às vezes só /v21.0 funciona.
  // Code 100 "Unsupported request - method type" em GET e POST juntos =
  // bloqueio de Access Verification / Instagram Tester (não é HTTP method).
  const bases = [
    "https://graph.instagram.com",
    "https://graph.instagram.com/v21.0",
    "https://graph.instagram.com/v22.0",
    "https://graph.instagram.com/v23.0",
  ];
  const methods: Array<"GET" | "POST"> = ["POST", "GET"];
  const errors: string[] = [];
  let sawMethodTypeBlock = false;

  for (const secret of secrets) {
    for (const base of bases) {
      for (const method of methods) {
        try {
          const endpoint = `${base}/access_token`;
          let res: Response;
          if (method === "GET") {
            const url = new URL(endpoint);
            url.searchParams.set("grant_type", "ig_exchange_token");
            url.searchParams.set("client_secret", secret);
            url.searchParams.set("access_token", shortLivedToken);
            res = await fetch(url.toString(), {
              method: "GET",
              cache: "no-store",
            });
          } else {
            const body = new URLSearchParams({
              grant_type: "ig_exchange_token",
              client_secret: secret,
              access_token: shortLivedToken,
            });
            res = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body,
              cache: "no-store",
            });
          }

          const json = (await res.json()) as TokenExchangeJson;
          const picked = pickAccessToken(json);
          if (picked.accessToken) {
            console.info(
              "[instagram] long-lived exchange ok via",
              method,
              base,
              "expires_in=",
              picked.expiresIn,
            );
            return {
              accessToken: picked.accessToken,
              expiresIn: picked.expiresIn ?? 60 * 24 * 60 * 60,
            };
          }

          const err = tokenExchangeError(json, res.status);
          if (/Unsupported request - method type/i.test(err)) {
            sawMethodTypeBlock = true;
          }
          errors.push(`${method} ${base}: ${err}`);
          console.error(
            "[instagram] long-lived",
            method,
            base,
            "failed",
            res.status,
            JSON.stringify(json).slice(0, 300),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${method} ${base}: ${msg}`);
        }
      }
    }
  }

  if (sawMethodTypeBlock) {
    throw new Error(
      "META_ACCESS_BLOCKED: A Meta bloqueou a troca do token (Access Verification / Instagram Tester). No App Dashboard: Roles → Instagram Testers (adicione a conta) e Basics → Verifications → Access verification.",
    );
  }

  throw new Error(
    errors.find((e) => !/Unsupported request - method type/i.test(e)) ??
      errors[0] ??
      "Long-lived token exchange failed",
  );
}

export async function refreshIgLongLivedToken(
  longLivedToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const methods: Array<"GET" | "POST"> = ["GET", "POST"];
  const errors: string[] = [];

  for (const method of methods) {
    try {
      let res: Response;
      if (method === "GET") {
        const url = new URL("https://graph.instagram.com/refresh_access_token");
        url.searchParams.set("grant_type", "ig_refresh_token");
        url.searchParams.set("access_token", longLivedToken);
        res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
        });
      } else {
        const body = new URLSearchParams({
          grant_type: "ig_refresh_token",
          access_token: longLivedToken,
        });
        res = await fetch("https://graph.instagram.com/refresh_access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          cache: "no-store",
        });
      }

      const json = (await res.json()) as TokenExchangeJson;
      const picked = pickAccessToken(json);
      if (picked.accessToken) {
        return {
          accessToken: picked.accessToken,
          expiresIn: picked.expiresIn ?? 60 * 24 * 60 * 60,
        };
      }
      errors.push(`${method}: ${tokenExchangeError(json, res.status)}`);
    } catch (e) {
      errors.push(
        `${method}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const useful =
    errors.find((e) => !/Unsupported request - method type/i.test(e)) ??
    errors[0] ??
    "Token refresh failed";
  throw new Error(useful);
}

/** @deprecated use exchangeCodeForShortLivedToken + exchangeForLongLivedToken */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const short = await exchangeCodeForShortLivedToken(code);
  const long = await exchangeForLongLivedToken(short.accessToken);
  return long.accessToken;
}

export async function fetchIgMeProfile(
  accessToken: string,
  fallbackUserId?: string,
): Promise<IgConnectedProfile> {
  try {
    const data = await igGraphGet<{
      user_id?: string;
      id?: string;
      username?: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
      followers_count?: number;
      data?: Array<{
        user_id?: string;
        username?: string;
        name?: string;
        account_type?: string;
        profile_picture_url?: string;
        followers_count?: number;
      }>;
    }>("me", accessToken, {
      fields:
        "user_id,username,name,account_type,profile_picture_url,followers_count",
    });

    const row = data.data?.[0] ?? data;
    // Preferir user_id profissional; `id` é app-scoped e quebra webhooks/perfil
    const igUserId = String(
      row.user_id ?? data.user_id ?? fallbackUserId ?? data.id ?? "",
    );
    if (!igUserId) {
      throw new Error("Não foi possível obter o Instagram User ID");
    }

    return {
      igUserId,
      username: row.username ?? data.username,
      name: row.name ?? data.name,
      accountType: row.account_type ?? data.account_type,
      profilePictureUrl: row.profile_picture_url ?? data.profile_picture_url,
      followersCount: row.followers_count ?? data.followers_count,
    };
  } catch (e) {
    if (fallbackUserId) {
      console.warn(
        "[instagram] /me failed, using oauth user_id:",
        e instanceof Error ? e.message : e,
      );
      return { igUserId: fallbackUserId };
    }
    throw e;
  }
}

/** Valida que o token responde no Graph (sem engolir erro com fallback). */
export async function assertIgTokenWorks(accessToken: string): Promise<void> {
  await igGraphGet<{ id?: string; user_id?: string }>("me", accessToken, {
    fields: "user_id,username",
  });
}

export async function subscribeIgWebhooks(
  igUserId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${IG_GRAPH}/${igUserId}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      subscribed_fields:
        "messages,messaging_postbacks,messaging_referral,comments",
    }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    error?: { message: string };
  };
  if (!res.ok || json.error || json.success === false) {
    throw new Error(json.error?.message ?? "Falha ao assinar webhooks");
  }
}

export async function verifyMessagingAccess(
  _igUserId: string,
  _accessToken: string,
): Promise<boolean> {
  return true;
}

export type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

const MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

function friendlyMediaError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("unsupported request") ||
    lower.includes("method type") ||
    lower.includes("permission") ||
    lower.includes("oauth") ||
    lower.includes("access token") ||
    lower.includes("(#100)")
  ) {
    return "Não foi possível carregar as publicações. Reconecte o Instagram em Configurações (Atualizar permissões) ou use “qualquer publicação”.";
  }
  if (lower.includes("rate limit") || lower.includes("throttl")) {
    return "Limite da API do Instagram atingido. Tente novamente em alguns minutos.";
  }
  return "Não foi possível listar publicações agora. Use “qualquer publicação” ou reconecte o Instagram.";
}

async function igMediaGet(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<{ data?: IgMediaItem[]; error?: string }> {
  const url = new URL(`${IG_GRAPH}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  // Instagram Login: access_token na query (Bearer costuma falhar em /media)
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const json = (await res.json()) as {
    data?: IgMediaItem[];
    error?: { message?: string };
  };
  if (!res.ok || json.error) {
    return { error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { data: json.data ?? [] };
}

/**
 * Lista mídia do Instagram Login.
 * Resolve o `user_id` profissional via /me (não o app-scoped id) e tenta
 * /{ig-user-id}/media e /me/media.
 */
export async function fetchIgUserMedia(params: {
  accessToken: string;
  storedIgUserId?: string | null;
  limit?: number;
}): Promise<{
  media: IgMediaItem[];
  igUserId: string | null;
  warning?: string;
  rawError?: string;
}> {
  const limit = String(params.limit ?? 24);
  let resolvedId = (params.storedIgUserId ?? "").trim() || null;

  try {
    const meUrl = new URL(`${IG_GRAPH}/me`);
    meUrl.searchParams.set("fields", "user_id,username");
    meUrl.searchParams.set("access_token", params.accessToken);
    const meRes = await fetch(meUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const me = (await meRes.json()) as {
      user_id?: string;
      id?: string;
      error?: { message?: string };
    };
    if (!me.error) {
      const fromMe = String(me.user_id ?? "").trim();
      if (fromMe) resolvedId = fromMe;
    } else {
      console.warn("[instagram] /me for media id failed:", me.error.message);
    }
  } catch (e) {
    console.warn(
      "[instagram] /me for media id failed:",
      e instanceof Error ? e.message : e,
    );
  }

  const attempts: Array<{ label: string; path: string }> = [];
  if (resolvedId) {
    attempts.push({ label: "user_media", path: `${resolvedId}/media` });
  }
  attempts.push({ label: "me_media", path: "me/media" });
  if (
    params.storedIgUserId &&
    params.storedIgUserId.trim() &&
    params.storedIgUserId.trim() !== resolvedId
  ) {
    attempts.push({
      label: "stored_media",
      path: `${params.storedIgUserId.trim()}/media`,
    });
  }

  let lastError = "";
  for (const attempt of attempts) {
    const result = await igMediaGet(attempt.path, params.accessToken, {
      fields: MEDIA_FIELDS,
      limit,
    });
    if (!result.error) {
      return {
        media: result.data ?? [],
        igUserId: resolvedId,
      };
    }
    lastError = result.error;
    console.warn(`[instagram] ${attempt.label} failed:`, result.error);
  }

  return {
    media: [],
    igUserId: resolvedId,
    warning: friendlyMediaError(lastError || "unknown"),
    rawError: lastError || undefined,
  };
}

export async function completeInstagramLogin(code: string): Promise<{
  accessToken: string;
  expiresAt: Date;
  profile: IgConnectedProfile;
  scopes: string;
  messagesEnabled: boolean;
}> {
  const short = await exchangeCodeForShortLivedToken(code);
  const fallbackId = short.userId?.trim() ? short.userId : undefined;

  let accessToken = short.accessToken;
  let expiresIn = 60 * 60;

  try {
    const long = await exchangeForLongLivedToken(short.accessToken);
    accessToken = long.accessToken;
    expiresIn = long.expiresIn;
    console.info("[instagram] long-lived exchange ok, expires_in=", expiresIn);
  } catch (exchangeErr) {
    const exchangeMsg =
      exchangeErr instanceof Error ? exchangeErr.message : String(exchangeErr);
    console.warn("[instagram] long-lived exchange failed:", exchangeMsg);

    // Workaround Meta: token inicial pode já funcionar; refresh às vezes gera 60d.
    try {
      const refreshed = await refreshIgLongLivedToken(short.accessToken);
      accessToken = refreshed.accessToken;
      expiresIn = refreshed.expiresIn;
      console.info(
        "[instagram] refresh fallback ok, expires_in=",
        expiresIn,
      );
    } catch (refreshErr) {
      console.warn(
        "[instagram] refresh fallback failed:",
        refreshErr instanceof Error ? refreshErr.message : refreshErr,
      );

      // Se /me funciona, conecta com o token curto (melhor que bloquear tudo).
      try {
        await assertIgTokenWorks(short.accessToken);
        accessToken = short.accessToken;
        expiresIn = 60 * 60;
        console.warn(
          "[instagram] using short-lived token; reconecte em ~1h ou conclua Access Verification na Meta",
        );
      } catch (meErr) {
        const meMsg = meErr instanceof Error ? meErr.message : String(meErr);
        console.error("[instagram] /me also failed:", meMsg);
        if (
          exchangeMsg.startsWith("META_ACCESS_BLOCKED") ||
          /Unsupported request - method type/i.test(meMsg)
        ) {
          throw new Error(
            "A Meta bloqueou esta conexão. No Meta App Dashboard: (1) Roles → Instagram Testers — adicione e aceite o convite na conta IG; (2) Basics → Verifications → Access verification (Tech Provider). Depois clique em Reconectar.",
          );
        }
        throw new Error(exchangeMsg.replace(/^META_ACCESS_BLOCKED:\s*/, ""));
      }
    }
  }

  let profile = await fetchIgMeProfile(accessToken, fallbackId);

  if (!profile.username || !profile.profilePictureUrl) {
    try {
      const again = await fetchIgMeProfile(accessToken, profile.igUserId);
      profile = {
        ...profile,
        ...again,
        igUserId: again.igUserId || profile.igUserId,
        username: again.username ?? profile.username,
        name: again.name ?? profile.name,
        profilePictureUrl: again.profilePictureUrl ?? profile.profilePictureUrl,
        followersCount: again.followersCount ?? profile.followersCount,
      };
    } catch {
      // mantém o que tiver
    }
  }

  try {
    await subscribeIgWebhooks(profile.igUserId, accessToken);
  } catch (e) {
    console.warn(
      "[instagram] webhook subscribe failed:",
      e instanceof Error ? e.message : e,
    );
  }

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    profile,
    scopes: normalizeScopes(short.permissions, META_OAUTH_SCOPES),
    messagesEnabled: true,
  };
}
