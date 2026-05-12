import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAcademyAmericana } from "@/lib/clientProfiles";

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, "0")}`;
}

type FieldEntry = { name: string; values: string[] };

function norm(value?: string | null): string {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").trim();
}

function extractField(raw: unknown, keywords: string[]): string | null {
  if (!Array.isArray(raw)) return null;
  const entries = raw as FieldEntry[];
  for (const entry of entries) {
    const name = norm(entry.name);
    if (keywords.some((kw) => name.includes(kw))) {
      return (entry.values?.[0] ?? "").trim() || null;
    }
  }
  return null;
}

// ─── Sou+ Icaraí scoring ────────────────────────────────────────────────────

const TIMING_KEYWORDS_ICARAI = ["pretende", "quando", "prazo", "adquirir", "imovel", "imov"];
const INVEST_KEYWORDS_ICARAI = ["invest", "valor", "ticket", "quanto", "orcamento", "budget"];

function timingRankIcarai(raw: string | null): number {
  if (!raw) return 0;
  const n = norm(raw);
  if (n.includes("agora")) return 3;
  if (n.includes("3") || n.includes("seis") || n.includes("6") || n.includes("meses")) return 2;
  if (n.includes("avaliando") || n.includes("avali")) return 1;
  return 0;
}

function investRankIcarai(raw: string | null): number {
  if (!raw) return 0;
  const n = norm(raw);
  if (n.includes("acima")) return 5;
  if (n.includes("700")) return 4;
  if (n.includes("500")) return 3;
  if (n.includes("300")) return 2;
  return 0;
}

function calcGradeIcarai(timing: string | null, invest: string | null): ImobGrade {
  const tr = timingRankIcarai(timing);
  const ir = investRankIcarai(invest);
  if (tr === 3 && ir >= 4) return "A";
  if (tr === 3 && ir >= 2) return "B";
  if (tr === 2 && ir >= 2) return "C";
  if (tr === 1 && ir >= 2) return "D";
  return "E";
}

function prettyTimingIcarai(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = norm(raw);
  if (n.includes("agora")) return "Agora";
  if (n.includes("3") || n.includes("6") || n.includes("meses")) return "3 a 6 meses";
  if (n.includes("avaliando")) return "Avaliando";
  return raw;
}

function prettyInvestIcarai(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = norm(raw);
  const INVEST_LABEL_MAP: [string[], string][] = [
    [["acima", "1"], "Acima de R$ 1M"],
    [["700"], "R$ 700k – 1M"],
    [["500"], "R$ 500k – 700k"],
    [["300"], "R$ 300k – 500k"],
    [["ate", "300"], "Até R$ 300k"],
  ];
  for (const [keys, label] of INVEST_LABEL_MAP) {
    if (keys.every((k) => n.includes(k))) return label;
  }
  return raw;
}

const GRADE_LABELS_ICARAI: Record<ImobGrade, string> = {
  A: "Hot MQL — Agora + Alto investimento",
  B: "MQL — Agora + Investimento qualificado",
  C: "MQL Morno — 3 a 6 meses + Qualificado",
  D: "Potencial — Avaliando com orçamento",
  E: "Fora do perfil",
};

// ─── Academy Americana scoring ───────────────────────────────────────────────

const DEGREE_KEYWORDS = ["grau", "academico", "formacao", "graduacao"];
const TIMING_KEYWORDS_ACADEMY = ["tempo", "quando", "prazo", "ir para", "estados unidos", "eua"];
const INVEST_KEYWORDS_ACADEMY = ["disposto", "invest", "sonho", "disposto a"];

function degreeRank(raw: string | null): number {
  if (!raw) return 0;
  const n = norm(raw);
  if (n.includes("mestrado") || n.includes("doutorado")) return 3;
  if (n.includes("graduacao") && (n.includes("completa") || n.includes("completo"))) return 2;
  if (n.includes("graduacao") && n.includes("cursando")) return 1;
  return 0;
}

function investRankAcademy(raw: string | null): number {
  if (!raw) return 0;
  const n = norm(raw);
  if (n.includes("necessario") || n.includes("o quanto")) return 3;
  if (n.includes("mais de")) return 2;
  if (n.includes("ate") && n.includes("5")) return 1;
  return 0;
}

function timelineRankAcademy(raw: string | null): number {
  if (!raw) return 0;
  const n = norm(raw);
  if (n.includes("6")) return 2;
  if (n.includes("1 ano") || n.includes("um ano")) return 2;
  if (n.includes("avaliando")) return 1;
  return 0;
}

function calcGradeAcademy(degree: string | null): "A" | "E" {
  return degreeRank(degree) >= 1 ? "A" : "E";
}

function prettyDegree(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = norm(raw);
  if (n.includes("doutorado") && n.includes("cursando")) return "Doutorando";
  if (n.includes("mestrado") && n.includes("cursando")) return "Mestrando";
  if (n.includes("doutorado") || n.includes("mestrado")) return "Mestre/Doutor";
  if (n.includes("graduacao") && n.includes("cursando")) return "Graduando";
  if (n.includes("graduacao")) return "Grad. Completa";
  if (n.includes("sem")) return "Sem graduação";
  return raw;
}

function prettyTimelineAcademy(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = norm(raw);
  if (n.includes("6")) return "6 meses";
  if (n.includes("1 ano") || n.includes("um ano")) return "1 ano";
  if (n.includes("avaliando")) return "Avaliando";
  return raw;
}

function prettyInvestAcademy(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = norm(raw);
  if (n.includes("necessario") || n.includes("o quanto")) return "O quanto for necessário";
  if (n.includes("mais de")) return "Mais de R$5k";
  if (n.includes("ate") && n.includes("5")) return "Até R$5k";
  if (n.includes("menos de")) return "Menos de R$5k";
  return raw;
}

const GRADE_LABELS_ACADEMY: Record<ImobGrade, string> = {
  A: "Qualificado — tem graduação",
  B: "—",
  C: "—",
  D: "—",
  E: "Não qualificado — sem graduação",
};

// ─── Shared ──────────────────────────────────────────────────────────────────

export type ImobGrade = "A" | "B" | "C" | "D" | "E";

function isMQL(grade: ImobGrade): boolean {
  return grade === "A" || grade === "B" || grade === "C";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clienteId } = await params;

  const searchParams = request.nextUrl.searchParams;
  const dataInicioParam = searchParams.get("dataInicio");
  const dataFimParam = searchParams.get("dataFim");
  const agrupamento = searchParams.get("agrupamento") ?? "semanal";
  const gradeFilter = searchParams.get("grade");
  const campanhaFilter = searchParams.get("campanha");
  const fallbackDays = Math.min(365, Math.max(1, parseInt(searchParams.get("periodo") ?? "90", 10) || 90));

  const dataFim = parseDateOnly(dataFimParam) ?? new Date();
  const dataInicio =
    parseDateOnly(dataInicioParam) ??
    new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate() - (fallbackDays - 1));

  const dataInicioStr = formatDateOnly(dataInicio);
  const dataFimStr = formatDateOnly(dataFim);

  const [allLeads, cliente] = await Promise.all([
    prisma.metaLeadIndividual.findMany({
      where: {
        clienteId,
        createdTime: {
          gte: new Date(dataInicioStr + "T00:00:00Z"),
          lte: new Date(dataFimStr + "T23:59:59Z"),
        },
      },
      orderBy: { createdTime: "desc" },
    }),
    prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { slug: true, nome: true, perfilPanel: true },
    }),
  ]);

  const isAcademy = isAcademyAmericana(cliente);
  const profile: "academy" | "icarai" = isAcademy ? "academy" : "icarai";
  const gradeLabels = isAcademy ? GRADE_LABELS_ACADEMY : GRADE_LABELS_ICARAI;

  const scored = allLeads.map((lead) => {
    const raw = lead.rawFieldData;

    if (isAcademy) {
      const degree = extractField(raw, DEGREE_KEYWORDS);
      const invest = extractField(raw, INVEST_KEYWORDS_ACADEMY);
      const timeline = extractField(raw, TIMING_KEYWORDS_ACADEMY);
      const grade = calcGradeAcademy(degree);
      return {
        ...lead,
        _timing: timeline,
        _invest: invest,
        _degree: degree,
        _grade: grade,
        _isMql: isMQL(grade),
        _timingLabel: prettyTimelineAcademy(timeline),
        _investLabel: prettyInvestAcademy(invest),
        _degreeLabel: prettyDegree(degree),
      };
    } else {
      const timing = extractField(raw, TIMING_KEYWORDS_ICARAI);
      const invest = extractField(raw, INVEST_KEYWORDS_ICARAI);
      const grade = calcGradeIcarai(timing, invest);
      return {
        ...lead,
        _timing: timing,
        _invest: invest,
        _degree: null as string | null,
        _grade: grade,
        _isMql: isMQL(grade),
        _timingLabel: prettyTimingIcarai(timing),
        _investLabel: prettyInvestIcarai(invest),
        _degreeLabel: null as string | null,
      };
    }
  });

  let filtered = scored;
  if (gradeFilter) filtered = filtered.filter((l) => l._grade === gradeFilter);
  if (campanhaFilter) filtered = filtered.filter((l) => l.campaignId === campanhaFilter);

  const totalLeads = allLeads.length;
  const totalMql = scored.filter((l) => l._isMql).length;
  const totalNonMql = totalLeads - totalMql;

  const gradeCount: Record<ImobGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const l of scored) gradeCount[l._grade]++;

  const timingCount: Record<string, number> = {};
  for (const l of scored) {
    const key = l._timingLabel;
    timingCount[key] = (timingCount[key] ?? 0) + 1;
  }

  const investCount: Record<string, number> = {};
  for (const l of scored) {
    const key = l._investLabel;
    investCount[key] = (investCount[key] ?? 0) + 1;
  }

  const degreeCount: Record<string, number> = {};
  if (isAcademy) {
    for (const l of scored) {
      const key = l._degreeLabel ?? "Não informado";
      degreeCount[key] = (degreeCount[key] ?? 0) + 1;
    }
  }

  const formMap: Record<string, { name: string | null; total: number; mql: number }> = {};
  for (const l of scored) {
    const fid = l.formId ?? "unknown";
    if (!formMap[fid]) formMap[fid] = { name: l.formName, total: 0, mql: 0 };
    formMap[fid].total++;
    if (l._isMql) formMap[fid].mql++;
  }

  // MQL por campanha (MetaLeadIndividual)
  const mqlByCampaign: Record<string, { name: string | null; total: number; mql: number }> = {};
  for (const l of scored) {
    const cid = l.campaignId ?? "_unknown";
    if (!mqlByCampaign[cid]) mqlByCampaign[cid] = { name: l.campaignName, total: 0, mql: 0 };
    mqlByCampaign[cid].total++;
    if (l._isMql) mqlByCampaign[cid].mql++;
  }

  // Hierarquia real: Campanha → Conjunto → Anúncio (MetaAdsCriativo)
  const metaAdsCriativos = await prisma.metaAdsCriativo.findMany({
    where: {
      clienteId,
      data: { gte: new Date(dataInicioStr), lte: new Date(dataFimStr) },
    },
    select: {
      campaignId: true, campaignName: true,
      adsetId: true, adsetName: true,
      adId: true, adName: true,
      leads: true, spend: true, impressions: true, clicks: true,
    },
  });

  type AdRow = { adName: string; leads: number; spend: number; impressions: number; clicks: number };
  type AdsetRow = { adsetName: string | null; leads: number; spend: number; impressions: number; clicks: number; ads: Record<string, AdRow> };
  type CampRow = { campaignName: string | null; leads: number; spend: number; impressions: number; clicks: number; adsets: Record<string, AdsetRow> };

  const campInsights: Record<string, CampRow> = {};
  for (const row of metaAdsCriativos) {
    const cid = row.campaignId ?? "_unknown";
    if (!campInsights[cid]) campInsights[cid] = { campaignName: row.campaignName, leads: 0, spend: 0, impressions: 0, clicks: 0, adsets: {} };
    const camp = campInsights[cid];
    camp.leads += row.leads;
    camp.spend += Number(row.spend);
    camp.impressions += row.impressions;
    camp.clicks += row.clicks;
    const asetKey = row.adsetId ?? "_unknown_adset";
    if (!camp.adsets[asetKey]) camp.adsets[asetKey] = { adsetName: row.adsetName, leads: 0, spend: 0, impressions: 0, clicks: 0, ads: {} };
    const adset = camp.adsets[asetKey];
    adset.leads += row.leads;
    adset.spend += Number(row.spend);
    adset.impressions += row.impressions;
    adset.clicks += row.clicks;
    const aid = row.adId;
    if (!adset.ads[aid]) adset.ads[aid] = { adName: row.adName, leads: 0, spend: 0, impressions: 0, clicks: 0 };
    const ad = adset.ads[aid];
    ad.leads += row.leads;
    ad.spend += Number(row.spend);
    ad.impressions += row.impressions;
    ad.clicks += row.clicks;
  }

  function calcCtr(clicks: number, impressions: number): number {
    return impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
  }
  function calcCpl(spend: number, leads: number): number | null {
    return leads > 0 && spend > 0 ? spend / leads : null;
  }
  function txMql(total: number, mql: number) { return total > 0 ? Math.round((mql / total) * 1000) / 10 : 0; }

  // Distribui `total` inteiro proporcionalmente a `parts` sem perda por arredondamento
  // (largest-remainder method — garante que a soma dos resultados == total)
  function distributeProportional(total: number, parts: number[]): number[] {
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum === 0 || total === 0) return parts.map(() => 0);
    const floats = parts.map(p => total * p / sum);
    const floors = floats.map(f => Math.floor(f));
    const remainder = total - floors.reduce((a, b) => a + b, 0);
    const order = floats
      .map((f, i) => ({ i, frac: f - Math.floor(f) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) floors[order[k].i]++;
    return floors;
  }

  const campanhasHierarchy = Object.entries(campInsights)
    .filter(([, d]) => d.campaignName) // ignora linhas sem nome (leads de teste sem campanha)
    .map(([cid, d]) => {
    const mqld = mqlByCampaign[cid] ?? { total: 0, mql: 0, name: d.campaignName };
    const campMql = mqld.mql;

    // Distribui MQL proporcionalmente por adset (sem arredondamento acumulado)
    const adsetEntries = Object.entries(d.adsets);
    const adsetMqls = distributeProportional(campMql, adsetEntries.map(([, a]) => a.leads));

    return {
      campaignId: cid,
      campaignName: d.campaignName ?? mqld.name,
      leadsMeta: d.leads,
      leadsScored: mqld.total,
      mql: campMql,
      taxaMql: txMql(mqld.total, campMql),
      invest: d.spend,
      impressions: d.impressions,
      clicks: d.clicks,
      ctr: calcCtr(d.clicks, d.impressions),
      cpl: calcCpl(d.spend, d.leads),
      adsets: adsetEntries.map(([adsetId, a], ai) => {
        const adsetMqlEst = adsetMqls[ai];
        // Distribui MQL do adset proporcionalmente pelos ads
        const adEntries = Object.entries(a.ads);
        const adMqls = distributeProportional(adsetMqlEst, adEntries.map(([, ad]) => ad.leads));
        return {
          adsetId,
          adsetName: a.adsetName ?? adsetId,
          leadsMeta: a.leads,
          mqlEst: adsetMqlEst,
          taxaMqlEst: d.leads > 0 ? Math.round((adsetMqlEst / d.leads) * 1000) / 10 : 0,
          invest: a.spend,
          impressions: a.impressions,
          clicks: a.clicks,
          ctr: calcCtr(a.clicks, a.impressions),
          cpl: calcCpl(a.spend, a.leads),
          ads: adEntries.map(([adId, ad], di) => {
            const adMqlEst = adMqls[di];
            return {
              adId,
              adName: ad.adName,
              leadsMeta: ad.leads,
              mqlEst: adMqlEst,
              taxaMqlEst: a.leads > 0 ? Math.round((adMqlEst / a.leads) * 1000) / 10 : 0,
              invest: ad.spend,
              impressions: ad.impressions,
              clicks: ad.clicks,
              ctr: calcCtr(ad.clicks, ad.impressions),
              cpl: calcCpl(ad.spend, ad.leads),
            };
          }).sort((a, b) => b.leadsMeta - a.leadsMeta || b.invest - a.invest),
        };
      }).sort((a, b) => b.leadsMeta - a.leadsMeta || b.invest - a.invest),
    };
  });
  // Adiciona campanhas com leads scored mas sem MetaAdsCriativo (e com nome real)
  for (const [cid, mqld] of Object.entries(mqlByCampaign)) {
    if (!campInsights[cid] && mqld.name) {
      campanhasHierarchy.push({
        campaignId: cid,
        campaignName: mqld.name,
        leadsMeta: 0, leadsScored: mqld.total, mql: mqld.mql,
        taxaMql: txMql(mqld.total, mqld.mql),
        invest: 0, impressions: 0, clicks: 0, ctr: 0, cpl: null, adsets: [],
      });
    }
  }
  campanhasHierarchy.sort((a, b) => b.invest - a.invest || b.leadsScored - a.leadsScored);

  const periodoMap: Record<string, { total: number; mql: number }> = {};
  for (const l of scored) {
    const key =
      agrupamento === "semanal"
        ? getWeekKey(new Date(l.createdTime))
        : getMonthKey(new Date(l.createdTime));
    if (!periodoMap[key]) periodoMap[key] = { total: 0, mql: 0 };
    periodoMap[key].total++;
    if (l._isMql) periodoMap[key].mql++;
  }

  const fatosMidia = await prisma.fatoMidiaDiario.findMany({
    where: {
      clienteId,
      data: { gte: new Date(dataInicioStr), lte: new Date(dataFimStr) },
      canal: "META",
    },
    select: { data: true, investimento: true },
  });
  const totalInvestimento = fatosMidia.reduce((s, f) => s + Number(f.investimento), 0);
  const cplMedio = totalLeads > 0 && totalInvestimento > 0 ? totalInvestimento / totalLeads : null;
  const custoMql = totalMql > 0 && totalInvestimento > 0 ? totalInvestimento / totalMql : null;

  const periodoSeries = Object.entries(periodoMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, data]) => ({ periodo, ...data }));

  const gradeDistribuicao = (["A", "B", "C", "D", "E"] as ImobGrade[]).map((g) => ({
    grade: g,
    total: gradeCount[g],
    label: gradeLabels[g],
    isMql: isMQL(g),
  }));

  const ACADEMY_INVEST_ORDER = ["O quanto for necessário", "Mais de R$5k", "Até R$5k", "Menos de R$5k", "Não informado"];
  const ICARAI_INVEST_ORDER = ["Acima de R$ 1M", "R$ 700k – 1M", "R$ 500k – 700k", "R$ 300k – 500k", "Até R$ 300k", "Não informado"];
  const investOrder = isAcademy ? ACADEMY_INVEST_ORDER : ICARAI_INVEST_ORDER;

  const ACADEMY_TIMING_ORDER = ["6 meses", "1 ano", "Avaliando", "Não informado"];
  const ICARAI_TIMING_ORDER = ["Agora", "3 a 6 meses", "Avaliando", "Estou avaliando", "Não informado"];
  const timingOrder = isAcademy ? ACADEMY_TIMING_ORDER : ICARAI_TIMING_ORDER;

  const DEGREE_ORDER = ["Mestre/Doutor", "Doutorando", "Mestrando", "Grad. Completa", "Graduando", "Sem graduação", "Não informado"];

  const LEADS_LIMIT = 500;
  const leadsList = filtered.slice(0, LEADS_LIMIT).map((l) => ({
    id: l.id,
    createdTime: l.createdTime.toISOString(),
    fullName: l.fullName,
    telefone: l.telefone,
    emailLead: l.emailLead,
    formName: l.formName,
    campaignName: l.campaignName,
    adName: l.adName,
    adsetName: l.adsetName,
    platform: l.platform,
    grade: l._grade,
    isMql: l._isMql,
    timingLabel: l._timingLabel,
    investLabel: l._investLabel,
    degreeLabel: l._degreeLabel,
  }));

  return NextResponse.json({
    profile,
    dataInicio: dataInicioStr,
    dataFim: dataFimStr,
    kpis: {
      totalLeads,
      totalMql,
      totalNonMql,
      totalInvestimento,
      cplMedio,
      custoMql,
      taxaMql: totalLeads > 0 ? Math.round((totalMql / totalLeads) * 1000) / 10 : 0,
    },
    gradeDistribuicao,
    timingDistribuicao: Object.entries(timingCount)
      .map(([timing, total]) => ({ timing, total }))
      .sort((a, b) => {
        const ia = timingOrder.indexOf(a.timing);
        const ib = timingOrder.indexOf(b.timing);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }),
    investDistribuicao: Object.entries(investCount)
      .map(([invest, total]) => ({ invest, total }))
      .sort((a, b) => {
        const ia = investOrder.indexOf(a.invest);
        const ib = investOrder.indexOf(b.invest);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }),
    degreeDistribuicao: isAcademy
      ? Object.entries(degreeCount)
          .map(([degree, total]) => ({ degree, total }))
          .sort((a, b) => {
            const ia = DEGREE_ORDER.indexOf(a.degree);
            const ib = DEGREE_ORDER.indexOf(b.degree);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          })
      : null,
    campanhasHierarchy,
    formsRanking: Object.entries(formMap)
      .map(([id, data]) => ({ formId: id, formName: data.name, total: data.total, mql: data.mql, taxaMql: data.total > 0 ? Math.round((data.mql / data.total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.mql - a.mql),
    periodoSeries,
    leads: leadsList,
    leadsTruncated: filtered.length > LEADS_LIMIT,
    totalFiltered: filtered.length,
    agrupamento,
  });
}
