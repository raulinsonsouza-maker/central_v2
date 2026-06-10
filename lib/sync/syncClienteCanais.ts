import { syncGoogleAdsCliente } from "@/lib/sync/googleAdsApiSync";
import { syncMetaCliente } from "@/lib/sync/metaApiSync";
import { syncAnalyticsCliente } from "@/lib/sync/analyticsApiSync";
import { syncMetaLeadsCliente } from "@/lib/sync/metaLeadsSync";
import { prisma } from "@/lib/db";
import { isImobClient } from "@/lib/clientProfiles";

export interface SyncClienteCanaisResult {
  ok: boolean;
  googleAds?: {
    ok: boolean;
    daysProcessed: number;
    error?: string;
  };
  meta?: {
    ok: boolean;
    daysProcessed: number;
    error?: string;
  };
  metaLeads?: {
    ok: boolean;
    leadsProcessed: number;
    leadsCreated: number;
    formsFound: number;
    error?: string;
  };
  analytics?: {
    ok: boolean;
    daysProcessed: number;
    error?: string;
  };
}

export async function syncClienteCanais(clienteId: string): Promise<SyncClienteCanaisResult> {
  const [contas, cliente] = await Promise.all([
    prisma.conta.findMany({
      where: {
        clienteId,
        plataforma: { in: ["GOOGLE_ADS", "META", "GOOGLE_ANALYTICS"] },
      },
    }),
    prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { slug: true, nome: true, perfilPanel: true, leadScoringEnabled: true },
    }),
  ]);

  const googleConta = contas.find((conta) => conta.plataforma === "GOOGLE_ADS");
  const metaConta = contas.find((conta) => conta.plataforma === "META");
  const analyticsConta = contas.find((conta) => conta.plataforma === "GOOGLE_ANALYTICS");

  const shouldSyncLeads = metaConta && (isImobClient(cliente) || (cliente?.leadScoringEnabled ?? false));

  const [googleAdsResult, metaResult, analyticsResult, metaLeadsResult] = await Promise.all([
    googleConta ? syncGoogleAdsCliente(clienteId, { customerId: googleConta.accountIdPlataforma ?? undefined }) : null,
    metaConta ? syncMetaCliente(clienteId, { accountId: metaConta.accountIdPlataforma ?? undefined }) : null,
    analyticsConta
      ? syncAnalyticsCliente(clienteId, { propertyId: analyticsConta.accountIdPlataforma ?? undefined })
      : null,
    shouldSyncLeads ? syncMetaLeadsCliente(clienteId) : null,
  ]);

  return {
    ok: !googleAdsResult?.error && !metaResult?.error && !analyticsResult?.error,
    googleAds: googleAdsResult
      ? {
          ok: !googleAdsResult.error,
          daysProcessed: googleAdsResult.daysProcessed,
          error: googleAdsResult.error,
        }
      : undefined,
    meta: metaResult
      ? {
          ok: !metaResult.error,
          daysProcessed: metaResult.daysProcessed,
          error: metaResult.error,
        }
      : undefined,
    metaLeads: metaLeadsResult
      ? {
          ok: !metaLeadsResult.error,
          leadsProcessed: metaLeadsResult.leadsProcessed,
          leadsCreated: metaLeadsResult.leadsCreated,
          formsFound: metaLeadsResult.formsFound,
          error: metaLeadsResult.error,
        }
      : undefined,
    analytics: analyticsResult
      ? {
          ok: !analyticsResult.error,
          daysProcessed: analyticsResult.daysProcessed,
          error: analyticsResult.error,
        }
      : undefined,
  };
}
