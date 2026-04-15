import { prisma } from "@/lib/db";

const KEYS = {
  metaAccessToken: "meta_access_token",
  metaAdAccountId: "meta_ad_account_id",
  googleDeveloperToken: "google_ads_developer_token",
  googleRefreshToken: "google_ads_refresh_token",
  googleClientId: "google_ads_client_id",
  googleClientSecret: "google_ads_client_secret",
  googleAnalyticsCredentials: "google_analytics_credentials",
} as const;

export interface IntegrationsConfig {
  metaAccessToken: string | null;
  metaAdAccountId: string | null;
  googleDeveloperToken: string | null;
  googleRefreshToken: string | null;
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleAnalyticsCredentials: string | null;
}

export async function getIntegrationsConfig(): Promise<IntegrationsConfig> {
  const rows = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          KEYS.metaAccessToken,
          KEYS.metaAdAccountId,
          KEYS.googleDeveloperToken,
          KEYS.googleRefreshToken,
          KEYS.googleClientId,
          KEYS.googleClientSecret,
          KEYS.googleAnalyticsCredentials,
        ],
      },
    },
  });

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    metaAccessToken: map.get(KEYS.metaAccessToken) ?? null,
    metaAdAccountId: map.get(KEYS.metaAdAccountId) ?? null,
    googleDeveloperToken: map.get(KEYS.googleDeveloperToken) ?? null,
    googleRefreshToken: map.get(KEYS.googleRefreshToken) ?? null,
    googleClientId: map.get(KEYS.googleClientId) ?? null,
    googleClientSecret: map.get(KEYS.googleClientSecret) ?? null,
    googleAnalyticsCredentials:
      process.env.GOOGLE_ANALYTICS_CREDENTIALS ?? map.get(KEYS.googleAnalyticsCredentials) ?? null,
  };
}

export async function updateIntegrationsConfig(data: {
  metaAccessToken?: string;
  metaAdAccountId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleAnalyticsCredentials?: string;
}) {
  const ops = [];

  if (data.metaAccessToken !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.metaAccessToken },
        create: { key: KEYS.metaAccessToken, value: data.metaAccessToken.trim() },
        update: { value: data.metaAccessToken.trim() },
      })
    );
  }

  if (data.metaAdAccountId !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.metaAdAccountId },
        create: { key: KEYS.metaAdAccountId, value: data.metaAdAccountId.trim() },
        update: { value: data.metaAdAccountId.trim() },
      })
    );
  }

  if (data.googleDeveloperToken !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.googleDeveloperToken },
        create: { key: KEYS.googleDeveloperToken, value: data.googleDeveloperToken.trim() },
        update: { value: data.googleDeveloperToken.trim() },
      })
    );
  }

  if (data.googleRefreshToken !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.googleRefreshToken },
        create: { key: KEYS.googleRefreshToken, value: data.googleRefreshToken.trim() },
        update: { value: data.googleRefreshToken.trim() },
      })
    );
  }

  if (data.googleClientId !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.googleClientId },
        create: { key: KEYS.googleClientId, value: data.googleClientId.trim() },
        update: { value: data.googleClientId.trim() },
      })
    );
  }

  if (data.googleClientSecret !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.googleClientSecret },
        create: { key: KEYS.googleClientSecret, value: data.googleClientSecret.trim() },
        update: { value: data.googleClientSecret.trim() },
      })
    );
  }

  if (data.googleAnalyticsCredentials !== undefined) {
    ops.push(
      prisma.systemConfig.upsert({
        where: { key: KEYS.googleAnalyticsCredentials },
        create: {
          key: KEYS.googleAnalyticsCredentials,
          value: data.googleAnalyticsCredentials.trim(),
        },
        update: { value: data.googleAnalyticsCredentials.trim() },
      })
    );
  }

  if (ops.length === 0) return;

  await prisma.$transaction(ops);
}

