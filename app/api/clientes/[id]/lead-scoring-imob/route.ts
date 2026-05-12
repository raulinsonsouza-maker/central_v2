import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

function extractField(raw: unknown, keywords: string[]): string | null {
  if (!Array.isArray(raw)) return null;
  const entries = raw as FieldEntry[];
  for (const entry of entries) {
    const name = (entry.name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keywords.some((kw) => name.includes(kw))) {
      return (entry.values?.[0] ?? "").trim() || null;
    }
  }
  return null;
}

const TIMING_KEYWORDS = ["pretende", "quando", "prazo", "adquirir", "imovel", "imov"];
const INVEST_KEYWORDS = ["invest", "valor", "ticket", "quanto", "orcamento", "budget"];

const INVEST_ORDER = [
  "ate 300",
  "300 mil ate 500",
  "300 mil até 500",
  "500 mil ate 700",
  "500 mil até 700",
  "700 mil ate 1",
  "700 mil até 1",
  "acima de 1",
  "acima 1",
];

function normalizeInvest(raw: string | null): string | null {
  if (!raw) return null;
  return raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
}

function investRank(raw: string | null): number {
  if (!raw) return 0;
  const n = normalizeInvest(raw) ?? "";
  if (n.includes("acima")) return 5;
  if (n.includes("700")) return 4;
  if (n.includes("500")) return 3;
  if (n.includes("300")) return 2;
  if (n.includes("ate 300") || n.includes("300 mil") && !n.includes("500")) return 1;
  if (n.includes("300")) return 2;
  return 0;
}

function isQualifiedInvest(rank: number): boolean {
  return rank >= 2;
}

function timingRank(raw: string | null): number {
  if (!raw) return 0;
  const n = (raw ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("agora")) return 3;
  if (n.includes("3") || n.includes("seis") || n.includes("6") || n.includes("meses")) return 2;
  if (n.includes("avaliando") || n.includes("avali")) return 1;
  return 0;
}

export type ImobGrade = "A" | "B" | "C" | "D" | "E";

function calcGrade(timing: string | null, invest: string | null): ImobGrade {
  const tr = timingRank(timing);
  const ir = investRank(invest);

  if (tr === 3 && ir >= 4) return "A";
  if (tr === 3 && ir >= 2) return "B";
  if (tr === 2 && ir >= 2) return "C";
  if (tr === 1 && ir >= 2) return "D";
  return "E";
}

function isMQL(grade: ImobGrade): boolean {
  return grade === "A" || grade === "B" || grade === "C";
}

const GRADE_LABELS: Record<ImobGrade, string> = {
  A: "Hot MQL — Agora + Alto investimento",
  B: "MQL — Agora + Investimento qualificado",
  C: "MQL Morno — 3 a 6 meses + Qualificado",
  D: "Potencial — Avaliando com orçamento",
  E: "Fora do perfil",
};

const INVEST_LABEL_MAP: Record<string, string> = {
  "ate 300 mil": "Até R$ 300k",
  "300 mil ate 500 mil": "R$ 300k – 500k",
  "300 mil até 500 mil": "R$ 300k – 500k",
  "500 mil ate 700 mil": "R$ 500k – 700k",
  "500 mil até 700 mil": "R$ 500k – 700k",
  "700 mil ate 1 milhao": "R$ 700k – 1M",
  "700 mil até 1 milhao": "R$ 700k – 1M",
  "acima de 1 milhao": "Acima de R$ 1M",
  "acima 1 milhao": "Acima de R$ 1M",
};

function prettyInvest(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = normalizeInvest(raw) ?? "";
  for (const [key, label] of Object.entries(INVEST_LABEL_MAP)) {
    if (n.includes(key.replace(/[^\w\s]/g, "").trim().split(" ")[0]) && n.includes(key.split(" ").slice(-1)[0])) {
      return label;
    }
  }
  for (const [key, label] of Object.entries(INVEST_LABEL_MAP)) {
    const words = key.replace(/[^\w\s]/g, "").trim().split(" ");
    if (words.every((w) => n.includes(w))) return label;
  }
  return raw;
}

function prettyTiming(raw: string | null): string {
  if (!raw) return "Não informado";
  const n = (raw ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("agora")) return "Agora";
  if (n.includes("3") || n.includes("6") || n.includes("meses")) return "3 a 6 meses";
  if (n.includes("avaliando")) return "Estou avaliando";
  return raw;
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
  const timingFilter = searchParams.get("timing");
  const investFilter = searchParams.get("invest");
  const campanhaFilter = searchParams.get("campanha");
  const fallbackDays = Math.min(365, Math.max(1, parseInt(searchParams.get("periodo") ?? "90", 10) || 90));

  const dataFim = parseDateOnly(dataFimParam) ?? new Date();
  const dataInicio =
    parseDateOnly(dataInicioParam) ??
    new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate() - (fallbackDays - 1));

  const dataInicioStr = formatDateOnly(dataInicio);
  const dataFimStr = formatDateOnly(dataFim);

  const whereBase = {
    clienteId,
    createdTime: {
      gte: new Date(dataInicioStr + "T00:00:00Z"),
      lte: new Date(dataFimStr + "T23:59:59Z"),
    },
  };

  const allLeads = await prisma.metaLeadIndividual.findMany({
    where: whereBase,
    orderBy: { createdTime: "desc" },
  });

  const scored = allLeads.map((lead) => {
    const raw = lead.rawFieldData;
    const timing = extractField(raw, TIMING_KEYWORDS);
    const invest = extractField(raw, INVEST_KEYWORDS);
    const grade = calcGrade(timing, invest);
    return {
      ...lead,
      _timing: timing,
      _invest: invest,
      _grade: grade,
      _isMql: isMQL(grade),
      _timingLabel: prettyTiming(timing),
      _investLabel: prettyInvest(invest),
    };
  });

  let filtered = scored;
  if (gradeFilter) filtered = filtered.filter((l) => l._grade === gradeFilter);
  if (timingFilter) filtered = filtered.filter((l) => prettyTiming(l._timing).toLowerCase().includes(timingFilter.toLowerCase()));
  if (investFilter) filtered = filtered.filter((l) => l._invest?.toLowerCase().includes(investFilter.toLowerCase()));
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

  const campanhaMap: Record<string, { name: string | null; total: number; mql: number }> = {};
  for (const l of scored) {
    if (!l.campaignId) continue;
    if (!campanhaMap[l.campaignId]) campanhaMap[l.campaignId] = { name: l.campaignName, total: 0, mql: 0 };
    campanhaMap[l.campaignId].total++;
    if (l._isMql) campanhaMap[l.campaignId].mql++;
  }

  const formMap: Record<string, { name: string | null; total: number; mql: number }> = {};
  for (const l of scored) {
    const fid = l.formId ?? "unknown";
    if (!formMap[fid]) formMap[fid] = { name: l.formName, total: 0, mql: 0 };
    formMap[fid].total++;
    if (l._isMql) formMap[fid].mql++;
  }

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
    label: GRADE_LABELS[g],
    isMql: isMQL(g),
  }));

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
  }));

  return NextResponse.json({
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
      .sort((a, b) => b.total - a.total),
    investDistribuicao: Object.entries(investCount)
      .map(([invest, total]) => ({ invest, total }))
      .sort((a, b) => {
        const orderKeys = ["Acima de R$ 1M", "R$ 700k – 1M", "R$ 500k – 700k", "R$ 300k – 500k", "Até R$ 300k", "Não informado"];
        return orderKeys.indexOf(a.invest) - orderKeys.indexOf(b.invest);
      }),
    campanhasRanking: Object.entries(campanhaMap)
      .map(([id, data]) => ({ campaignId: id, campaignName: data.name, total: data.total, mql: data.mql, taxaMql: data.total > 0 ? Math.round((data.mql / data.total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.mql - a.mql),
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
