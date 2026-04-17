import { fetchCampaignInsightsAggregatedByDay, fetchCampaignInsightsPerCampaign, fetchAdsWithCreatives } from "@/lib/meta/metaClient";
import { mapMetaInsightToFatoPayload } from "@/lib/mappers/metaToDomain";
import { upsertFatoMidia } from "@/lib/repositories/fatosMidiaRepository";
import { upsertMetaAdsCriativo } from "@/lib/repositories/metaAdsCriativosRepository";
import { findAllClientes } from "@/lib/repositories/clientesRepository";
import { prisma } from "@/lib/db";
import { getIntegrationsConfig } from "@/lib/config/integrations";
import { isFlorien } from "@/lib/clientProfiles";

const DEFAULT_DATE_FROM = "2026-01-01";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface MetaSyncOptions {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  creativeDateFrom?: string;
  creativeDateTo?: string;
}

export interface MetaSyncResult {
  daysProcessed: number;
  creativesProcessed: number;
  error?: string;
}

/**
 * Sync META channel data from Meta Marketing API into FatoMidiaDiario.
 * Uses default date range from 2026-01-01 to today unless overridden.
 */
export async function syncMetaCliente(
  clienteId: string,
  options?: MetaSyncOptions
): Promise<MetaSyncResult> {
  const fromDb = await getIntegrationsConfig();
  const token = fromDb.metaAccessToken ?? process.env.META_ACCESS_TOKEN;
  const defaultAccountId = fromDb.metaAdAccountId ?? process.env.META_AD_ACCOUNT_ID;

  if (!token) {
    return { daysProcessed: 0, creativesProcessed: 0, error: "META_ACCESS_TOKEN não configurado" };
  }
  let accountId = options?.accountId ?? defaultAccountId;
  if (!accountId) {
    // Look up the account from the Conta table for this client
    const conta = await prisma.conta.findFirst({
      where: { clienteId, plataforma: "META" },
    });
    if (conta?.accountIdPlataforma) {
      accountId = conta.accountIdPlataforma;
    }
  }
  if (!accountId) {
    return { daysProcessed: 0, creativesProcessed: 0, error: "META_AD_ACCOUNT_ID não configurado" };
  }

  const today = formatDate(new Date());
  const dateFrom = options?.dateFrom ?? DEFAULT_DATE_FROM;
  const dateTo = options?.dateTo ?? today;
  const creativeDateFrom = options?.creativeDateFrom ?? options?.dateFrom ?? today;
  const creativeDateTo = options?.creativeDateTo ?? options?.dateTo ?? today;

  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { nome: true, slug: true, perfilPanel: true } });
    // Florien: campaign-level aggregated by day (profile visits metric, no per-campaign rows)
    const useCampaignAggregated = isFlorien(cliente);

    let rows: Awaited<ReturnType<typeof fetchCampaignInsightsPerCampaign>>;
    if (useCampaignAggregated) {
      const resp = await fetchCampaignInsightsAggregatedByDay(accountId, token, dateFrom, dateTo);
      rows = resp.data ?? [];
    } else {
      // All other clients: per-campaign rows with campaign_name stored separately
      rows = await fetchCampaignInsightsPerCampaign(accountId, token, dateFrom, dateTo);
    }

    let contaId: string | null = null;
    const conta = await prisma.conta.findFirst({
      where: { clienteId, plataforma: "META", accountIdPlataforma: accountId },
    });
    if (conta) contaId = conta.id;

    // Remove ALL old aggregate rows (campaignName="") so they don't pollute campaign breakdowns.
    if (!useCampaignAggregated && rows.length > 0) {
      await prisma.fatoMidiaDiario.deleteMany({
        where: { clienteId, canal: "META", campaignName: "" },
      });
    }

    for (const row of rows) {
      const payload = mapMetaInsightToFatoPayload(row);
      await upsertFatoMidia(clienteId, payload.data, "META", {
        impressoes: payload.impressoes,
        cliques: payload.cliques,
        leads: payload.leads,
        conversoes: payload.conversoes,
        onFacebookLeads: payload.onFacebookLeads,
        websiteLeads: payload.websiteLeads,
        messagingConversationsStarted: payload.messagingConversationsStarted,
        contacts: payload.contacts,
        purchases: payload.purchases,
        investimento: payload.investimento,
        cpl: payload.cpl,
        costPerPurchase: payload.costPerPurchase,
        websitePurchaseRoas: payload.websitePurchaseRoas,
        websitePurchasesConversionValue: payload.websitePurchasesConversionValue,
        alcance: payload.alcance,
        checkoutIniciado: payload.checkoutIniciado,
        profileVisits: payload.profileVisits,
        contaId: contaId ?? undefined,
        campaignName: payload.campaignName,
      });
    }

    const creativeSnapshotDate = new Date(`${creativeDateTo}T00:00:00`);
    const ads = await fetchAdsWithCreatives(accountId, token, {
      dateFrom: creativeDateFrom,
      dateTo: creativeDateTo,
    });

    for (const ad of ads) {
      const creative = ad.adcreatives?.data?.[0];
      const insight = ad.insights?.data?.[0];
      if (!creative) continue;

      // Extract conversion data from actions/action_values
      const getAction = (arr: Array<{ action_type: string; value: string }> | undefined, type: string) =>
        parseInt(arr?.find(a => a.action_type === type)?.value ?? "0", 10) || 0;
      const getActionValue = (arr: Array<{ action_type: string; value: string }> | undefined, type: string) =>
        parseFloat(arr?.find(a => a.action_type === type)?.value ?? "0") || 0;
      const actions = insight?.actions ?? [];
      const actionValues = insight?.action_values ?? [];

      const leads =
        getAction(actions, "lead") ||
        getAction(actions, "onsite_conversion.lead_grouped") ||
        getAction(actions, "offsite_conversion.fb_pixel_lead") ||
        getAction(actions, "website_lead");

      const purchases =
        getAction(actions, "purchase") ||
        getAction(actions, "omni_purchase") ||
        getAction(actions, "offsite_conversion.fb_pixel_purchase") ||
        getAction(actions, "website_purchase");

      const revenue =
        getActionValue(actionValues, "purchase") ||
        getActionValue(actionValues, "omni_purchase") ||
        getActionValue(actionValues, "offsite_conversion.fb_pixel_purchase") ||
        getActionValue(actionValues, "website_purchase");

      await upsertMetaAdsCriativo(clienteId, {
        data: creativeSnapshotDate,
        adId: ad.id,
        creativeId: creative.id,
        adName: ad.name,
        effectiveStatus: ad.effective_status ?? null,
        campaignId: ad.adset?.campaign?.id ?? null,
        campaignName: ad.adset?.campaign?.name ?? null,
        adsetId: ad.adset?.id ?? null,
        adsetName: ad.adset?.name ?? null,
        campaignObjective: ad.adset?.campaign?.objective ?? null,
        mediaType: creative.video_source_url || creative.video_id ? "VIDEO" : "IMAGE",
        imageUrl: creative.image_url_full ?? creative.thumbnail_url ?? creative.image_url ?? null,
        imageUrlFull: creative.image_url_full ?? null,
        videoId: creative.video_id ?? null,
        videoSourceUrl: creative.video_source_url ?? null,
        videoPictureUrl: creative.video_picture_url ?? null,
        videoEmbedHtml: (creative as { video_embed_html?: string }).video_embed_html ?? null,
        body: creative.body ?? null,
        title: creative.title ?? null,
        spend: insight?.spend ? parseFloat(insight.spend) : 0,
        impressions: insight?.impressions ? parseInt(insight.impressions, 10) : 0,
        clicks: insight?.clicks ? parseInt(insight.clicks, 10) : 0,
        leads,
        purchases,
        websitePurchasesConversionValue: revenue,
        ctr: insight?.ctr ? parseFloat(insight.ctr) : null,
        cpc: insight?.cpc ? parseFloat(insight.cpc) : null,
        contaId,
      });
    }

    return { daysProcessed: rows.length, creativesProcessed: ads.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { daysProcessed: 0, creativesProcessed: 0, error: message };
  }
}

export interface MetaSyncAllResult {
  clienteId: string;
  daysProcessed: number;
  creativesProcessed: number;
  error?: string;
}

/**
 * Sync META for all active clients. Uses Conta META when available, else META_AD_ACCOUNT_ID.
 */
export async function syncMetaTodosClientes(options?: { dateFrom?: string; dateTo?: string }): Promise<MetaSyncAllResult[]> {
  const fromDb = await getIntegrationsConfig();
  const token = fromDb.metaAccessToken ?? process.env.META_ACCESS_TOKEN;
  const defaultAccountId = fromDb.metaAdAccountId ?? process.env.META_AD_ACCOUNT_ID;

  if (!token) {
    return [{ clienteId: "_", daysProcessed: 0, creativesProcessed: 0, error: "META_ACCESS_TOKEN não configurado" }];
  }

  const clientes = await findAllClientes(true);
  const today = formatDate(new Date());
  const dateFrom = options?.dateFrom ?? DEFAULT_DATE_FROM;
  const dateTo = options?.dateTo ?? today;
  const results: MetaSyncAllResult[] = [];

  for (const cliente of clientes) {
    const conta = await prisma.conta.findFirst({
      where: { clienteId: cliente.id, plataforma: "META" },
    });
    const accountId = conta?.accountIdPlataforma ?? defaultAccountId;
    if (!accountId) {
      results.push({ clienteId: cliente.id, daysProcessed: 0, creativesProcessed: 0, error: "Sem conta Meta configurada" });
      continue;
    }

    const result = await syncMetaCliente(cliente.id, {
      dateFrom,
      dateTo,
      accountId,
      creativeDateFrom: dateFrom,
      creativeDateTo: dateTo,
    });
    results.push({
      clienteId: cliente.id,
      daysProcessed: result.daysProcessed,
      creativesProcessed: result.creativesProcessed,
      error: result.error,
    });
  }

  return results;
}
