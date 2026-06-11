import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";
import { getTagFilter, buildTagFilterWhere } from "@/lib/crm/tagFilter";
import { buildLeadFilterWhere } from "@/lib/crm/canalFilter";

type Canal = "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canalFromMidia(
  midiaOriginal: string | null,
  fonte: string | null,
): Canal {
  if (midiaOriginal) {
    const m = norm(midiaOriginal);
    if (m.includes("facebook") || m.includes("meta") || m.includes("instagram") || m.includes("fb ads") || m.includes("meta ads") || /\bfb\b/.test(m)) return "META";
    if (m.includes("google") || m.includes("youtube") || m.includes("pmax") || m.includes("busca paga") || m.includes("performance max")) return "GOOGLE";
    if (m.includes("indica") || m.includes("referral") || m.includes("referencia") || m.includes("amigo") || m.includes("parceiro")) return "INDICACAO";
    if (m.includes("organic") || m.includes("organico") || m.includes("seo")) return "ORGANICO";
    if (m.includes("email") || m.includes("whatsapp")) return "DIRETO";
  }
  if (!fonte) return "OUTRO";
  const f = norm(fonte);
  if (f.includes("facebook") || f.includes("meta") || f.includes("instagram") || f.includes("fb ads") || /\bfb\b/.test(f)) return "META";
  if (f.includes("google") || f.includes("busca paga") || f.includes("youtube") || f.includes("pmax") || f.includes("performance max")) return "GOOGLE";
  if (f.includes("organic") || f.includes("organico") || f.includes("seo")) return "ORGANICO";
  if (f.includes("indica") || f.includes("referral") || f.includes("referencia") || f.includes("parceiro")) return "INDICACAO";
  if (f.includes("direto") || f.includes("direct") || f.includes("whatsapp") || f.includes("site") || f.includes("email")) return "DIRETO";
  return "OUTRO";
}

// Alert tags: leads that should probably not be in the active funnel
const ALERTA_KEYWORDS = [
  "nao quer", "sem interesse", "renda insuficiente", "contato inexistente",
  "desistencia", "invalido", "duplicado", "descartado", "nao quer imovel",
  "busca outra", "nao retorna",
];

function isAlertaTag(tagNormalized: string): boolean {
  return ALERTA_KEYWORDS.some((k) => tagNormalized.includes(k));
}

type DadosCvJson = {
  estado?: string | null;
  conversaoOriginal?: string | null;
  midiaOriginal?: string | null;
  tags?: unknown; // string, comma-separated string, or string[]
  possibilidadeVenda?: string | number | null; // CV stores as number 1–5
} | null;

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parsePv(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return (!isNaN(n) && n >= 1 && n <= 5) ? n : null;
}

type DadosMarketingJson = {
  metaAdId?: string | null;
  metaAdName?: string | null;
  metaAdsetId?: string | null;
  metaAdsetName?: string | null;
  metaCampaignId?: string | null;
  metaCampaignName?: string | null;
  metaFormId?: string | null;
  metaFormName?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
} | null;

function parseDadosCv(raw: Prisma.JsonValue): DadosCvJson {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DadosCvJson;
}

function parseDadosMarketing(raw: Prisma.JsonValue): DadosMarketingJson {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DadosMarketingJson;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const filterType  = url.searchParams.get("filterType");
  const filterValue = url.searchParams.get("filterValue");

  const dateFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const dateTo = toParam
    ? (() => { const d = new Date(toParam); d.setHours(23, 59, 59, 999); return d; })()
    : now;

  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { ativo: true, tipo: true, ultimoSyncAt: true },
  });
  if (!config?.ativo) {
    return NextResponse.json({ configured: false });
  }

  const tagFilter = await getTagFilter(id);
  const tagFilterWhere = buildTagFilterWhere(tagFilter);
  const leadFilterWhere = buildLeadFilterWhere(filterType, filterValue);

  const andClauses = [
    ...(tagFilter.length > 0 ? [tagFilterWhere] : []),
    ...(filterType && filterValue ? [leadFilterWhere] : []),
  ];

  const leads = await prisma.leadCrm.findMany({
    where: {
      clienteId: id,
      dataEntrada: { gte: dateFrom, lte: dateTo },
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    },
    select: { fonte: true, valor: true, dataFechamento: true, status: true, rating: true, dadosCv: true, etapa: true, dadosMarketing: true },
  });

  const fatoRows = await prisma.fatoMidiaDiario.findMany({
    where: { clienteId: id, data: { gte: dateFrom, lte: dateTo }, canal: { in: ["META", "GOOGLE"] } },
    select: { canal: true, investimento: true, leads: true, conversoes: true },
  });

  const investMeta = fatoRows.filter((r) => r.canal === "META").reduce((s, r) => s + Number(r.investimento), 0);
  const investGoogle = fatoRows.filter((r) => r.canal === "GOOGLE").reduce((s, r) => s + Number(r.investimento), 0);
  const leadsMeta = fatoRows.filter((r) => r.canal === "META").reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);
  const leadsGoogle = fatoRows.filter((r) => r.canal === "GOOGLE").reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);

  type Bucket = {
    leads: number; ganhos: number; perdidos: number; andamento: number;
    valor: number; ratingSum: number; ratingCount: number; visitou: number;
    pvSum: number; pvCount: number;
  };

  const emptyBucket = (): Bucket => ({
    leads: 0, ganhos: 0, perdidos: 0, andamento: 0, valor: 0,
    ratingSum: 0, ratingCount: 0, visitou: 0, pvSum: 0, pvCount: 0,
  });

  const fonteMap = new Map<string, Bucket>();
  const canalMap = new Map<string, Bucket>();
  const estadoMap = new Map<string, Bucket>();
  const conversaoMap = new Map<string, Bucket>();
  const campanhaMap = new Map<string, { canal: Canal } & Bucket>();
  const criativoMap = new Map<string, { adId: string | null; adsetName: string | null; campaignName: string | null } & Bucket>();
  const campanhaConfirmadaMap = new Map<string, Bucket>();

  // Tag tracking
  const tagMap = new Map<string, number>();
  let leadsComTags = 0;
  let alertaLeads = 0;

  let leadsComEstado = 0;
  let leadsComConversao = 0;
  let metaLeadsConfirmados = 0;

  for (const lead of leads) {
    const cv = parseDadosCv(lead.dadosCv);
    const midiaOriginal = cv?.midiaOriginal?.trim() ?? null;
    const canal = canalFromMidia(midiaOriginal, lead.fonte);

    const isWon = lead.status === "won";
    const isLost = lead.status === "lost";
    const valor = lead.valor ? Number(lead.valor) : 0;
    const rating = lead.rating ?? null;
    const etapaLower = norm(lead.etapa ?? "");
    const visitou = etapaLower.includes("visit");

    // possibilidadeVenda 1-5 (manual broker assessment)
    const pv = parsePv(cv?.possibilidadeVenda);

    // Tags — handle string, comma-separated, or array storage formats
    const rawTags = parseTags(cv?.tags);
    if (rawTags.length > 0) {
      leadsComTags++;
      let hasAlerta = false;
      for (const t of rawTags) {
        const key = norm(t.trim());
        if (key) {
          tagMap.set(key, (tagMap.get(key) ?? 0) + 1);
          if (isAlertaTag(key)) hasAlerta = true;
        }
      }
      if (hasAlerta) alertaLeads++;
    }

    const addTo = (map: Map<string, Bucket>, key: string) => {
      let b = map.get(key);
      if (!b) { b = emptyBucket(); map.set(key, b); }
      b.leads++;
      if (visitou) b.visitou++;
      if (isWon) { b.ganhos++; b.valor += valor; } else if (isLost) b.perdidos++; else b.andamento++;
      if (rating != null) { b.ratingSum += rating; b.ratingCount++; }
      if (pv != null) { b.pvSum += pv; b.pvCount++; }
    };

    addTo(fonteMap, lead.fonte ?? "(sem fonte)");
    addTo(canalMap, canal);

    const estado = cv?.estado?.trim() || null;
    if (estado) { leadsComEstado++; addTo(estadoMap, estado); }

    const conversao = cv?.conversaoOriginal?.trim() || midiaOriginal || null;
    if (conversao) { leadsComConversao++; addTo(conversaoMap, conversao); }

    const conversaoKey = cv?.conversaoOriginal?.trim() ?? null;
    if (conversaoKey && (canal === "META" || canal === "GOOGLE")) {
      const cKey = `${canal}:::${conversaoKey}`;
      let b = campanhaMap.get(cKey);
      if (!b) { b = { canal, ...emptyBucket() }; campanhaMap.set(cKey, b); }
      b.leads++;
      if (visitou) b.visitou++;
      if (isWon) { b.ganhos++; b.valor += valor; } else if (isLost) b.perdidos++; else b.andamento++;
      if (rating != null) { b.ratingSum += rating; b.ratingCount++; }
      if (pv != null) { b.pvSum += pv; b.pvCount++; }
    }
  }

  // ── porCriativo + porCampanhaConfirmada ─────────────────────────────────────
  const metaLeadForms = await prisma.metaLeadIndividual.findMany({
    where: { clienteId: id, createdTime: { gte: dateFrom, lte: dateTo } },
    select: { metaLeadId: true, adName: true, adId: true, adsetName: true, campaignName: true },
  });

  if (metaLeadForms.length > 0) {
    const metaLeadIds = metaLeadForms.map((ml) => ml.metaLeadId);
    // Apply tag filter (and leadFilter) so porCriativo only counts leads that
    // passed the configured filters — not all raw Meta form submissions.
    const crmMatched = await prisma.leadCrm.findMany({
      where: {
        clienteId: id,
        metaLeadId: { in: metaLeadIds },
        ...(andClauses.length > 0 ? { AND: andClauses } : {}),
      },
      select: { metaLeadId: true, status: true, valor: true, etapa: true, rating: true },
    });
    const crmByMeta = new Map(crmMatched.map((l) => [l.metaLeadId!, l]));

    // metaLeadsConfirmados = how many forms matched a tag-filtered CRM lead
    metaLeadsConfirmados = crmByMeta.size;

    for (const ml of metaLeadForms) {
      const crm = crmByMeta.get(ml.metaLeadId);
      // Only count this form if it corresponds to a tag-filtered CRM lead
      if (!crm) continue;

      const adName = ml.adName?.trim() ?? "(sem nome)";

      let cb = criativoMap.get(adName);
      if (!cb) {
        cb = { adId: ml.adId ?? null, adsetName: ml.adsetName ?? null, campaignName: ml.campaignName ?? null, ...emptyBucket() };
        criativoMap.set(adName, cb);
      }
      cb.leads++;

      if (ml.campaignName) {
        const campKey = ml.campaignName.trim();
        let ccb = campanhaConfirmadaMap.get(campKey);
        if (!ccb) { ccb = emptyBucket(); campanhaConfirmadaMap.set(campKey, ccb); }
        ccb.leads++;
      }

      {
        const isWon = crm.status === "won";
        const isLost = crm.status === "lost";
        const etapaLower = norm(crm.etapa ?? "");
        const visitouCrm = etapaLower.includes("visit");
        const valorCrm = crm.valor ? Number(crm.valor) : 0;
        const r = crm.rating ?? null;

        if (visitouCrm) cb.visitou++;
        if (isWon) { cb.ganhos++; cb.valor += valorCrm; } else if (isLost) cb.perdidos++; else cb.andamento++;
        if (r != null) { cb.ratingSum += r; cb.ratingCount++; }

        if (ml.campaignName) {
          const ccb = campanhaConfirmadaMap.get(ml.campaignName.trim())!;
          if (visitouCrm) ccb.visitou++;
          if (isWon) { ccb.ganhos++; ccb.valor += valorCrm; } else if (isLost) ccb.perdidos++; else ccb.andamento++;
          if (r != null) { ccb.ratingSum += r; ccb.ratingCount++; }
        }
      }
    }
  }

  const toRow = (key: string, b: Bucket) => ({
    key,
    leads: b.leads,
    ganhos: b.ganhos,
    perdidos: b.perdidos,
    andamento: b.andamento,
    visitou: b.visitou,
    valor: b.valor,
    taxaGanho: b.leads > 0 ? Math.round((b.ganhos / b.leads) * 100) : 0,
    taxaPerda: b.leads > 0 ? Math.round((b.perdidos / b.leads) * 100) : 0,
    ratingMedio: b.ratingCount > 0 ? Math.round((b.ratingSum / b.ratingCount) * 10) / 10 : null,
    pvMedio: b.pvCount > 0 ? Math.round((b.pvSum / b.pvCount) * 10) / 10 : null,
  });

  const porFonte = [...fonteMap.entries()]
    .map(([fonte, b]) => {
      const canal = canalFromMidia(null, fonte === "(sem fonte)" ? null : fonte);
      return {
        fonte, canal,
        ...toRow(fonte, b),
        investCanal: canal === "META" ? investMeta : canal === "GOOGLE" ? investGoogle : null,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const CANAL_ORDER: Canal[] = ["META", "GOOGLE", "ORGANICO", "INDICACAO", "DIRETO", "OUTRO"];
  const porCanal = [...canalMap.entries()]
    .map(([canal, b]) => ({
      canal, ...toRow(canal, b),
      investCanal: canal === "META" ? investMeta : canal === "GOOGLE" ? investGoogle : null,
    }))
    .sort((a, b) => CANAL_ORDER.indexOf(a.canal as Canal) - CANAL_ORDER.indexOf(b.canal as Canal));

  const porEstado = [...estadoMap.entries()]
    .map(([estado, b]) => ({ estado, ...toRow(estado, b) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 20);

  const porConversao = [...conversaoMap.entries()]
    .map(([conversao, b]) => ({ conversao, ...toRow(conversao, b) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 50);

  const porCampanha = [...campanhaMap.entries()]
    .map(([cKey, b]) => {
      const campanha = cKey.includes(":::") ? cKey.split(":::")[1] : cKey;
      return {
        campanha, canal: b.canal,
        ...toRow(campanha, b),
        investCanal: b.canal === "META" ? investMeta : b.canal === "GOOGLE" ? investGoogle : null,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const porCriativo = [...criativoMap.entries()]
    .map(([adName, b]) => ({
      adName,
      adId: b.adId,
      adsetName: b.adsetName,
      campaignName: b.campaignName,
      ...toRow(adName, b),
    }))
    .sort((a, b) => b.leads - a.leads);

  const totalLeads = leads.length;
  const totalGanhos = leads.filter((l) => l.status === "won").length;
  const totalPerdidos = leads.filter((l) => l.status === "lost").length;
  const totalAndamento = totalLeads - totalGanhos - totalPerdidos;
  const totalValor = leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.valor ? Number(l.valor) : 0), 0);
  const metaCrmLeads = porCanal.find((c) => c.canal === "META")?.leads ?? 0;
  const googleCrmLeads = porCanal.find((c) => c.canal === "GOOGLE")?.leads ?? 0;
  const metaGanhos = porCanal.find((c) => c.canal === "META")?.ganhos ?? 0;
  const googleGanhos = porCanal.find((c) => c.canal === "GOOGLE")?.ganhos ?? 0;

  const porCampanhaConfirmada = [...campanhaConfirmadaMap.entries()]
    .map(([campaignName, b]) => ({
      campaignName,
      ...toRow(campaignName, b),
    }))
    .sort((a, b) => b.leads - a.leads);

  // Tag breakdown — individual tags sorted by count
  const porTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count, isAlerta: isAlertaTag(tag) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return NextResponse.json({
    configured: true,
    periodo: { from: dateFrom, to: dateTo },
    totalLeads, totalGanhos, totalPerdidos, totalAndamento, totalValor,
    investMeta, investGoogle, leadsMeta, leadsGoogle, metaCrmLeads, googleCrmLeads,
    metaLeadsConfirmados,
    cplMetaCampanha: leadsMeta > 0 ? investMeta / leadsMeta : null,
    cplGoogleCampanha: leadsGoogle > 0 ? investGoogle / leadsGoogle : null,
    cplMetaCrm: metaCrmLeads > 0 ? investMeta / metaCrmLeads : null,
    cplGoogleCrm: googleCrmLeads > 0 ? investGoogle / googleCrmLeads : null,
    cplMetaConfirmado: metaLeadsConfirmados > 0 ? investMeta / metaLeadsConfirmados : null,
    cacMetaCrm: metaGanhos > 0 && investMeta > 0 ? investMeta / metaGanhos : null,
    cacGoogleCrm: googleGanhos > 0 && investGoogle > 0 ? investGoogle / googleGanhos : null,
    porFonte, porCanal, porEstado, porConversao, porCampanha, porCriativo,
    porCampanhaConfirmada,
    leadsComEstado, leadsComConversao,
    porTags, totalComTags: leadsComTags, alertaLeads,
    ultimoSyncAt: config.ultimoSyncAt,
  });
}
