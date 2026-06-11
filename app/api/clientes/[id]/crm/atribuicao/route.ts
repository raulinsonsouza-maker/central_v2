import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

type Canal = "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canalFromMidia(
  midiaOriginal: string | null,
  fonte: string | null,
): Canal {
  // Primary: midiaOriginal has the real paid media channel name
  if (midiaOriginal) {
    const m = norm(midiaOriginal);
    if (m.includes("facebook") || m.includes("meta") || m.includes("instagram") || m.includes("fb ads") || m.includes("meta ads") || /\bfb\b/.test(m)) return "META";
    if (m.includes("google") || m.includes("youtube") || m.includes("pmax") || m.includes("busca paga") || m.includes("performance max")) return "GOOGLE";
    if (m.includes("indica") || m.includes("referral") || m.includes("referencia") || m.includes("amigo") || m.includes("parceiro")) return "INDICACAO";
    if (m.includes("organic") || m.includes("organico") || m.includes("seo")) return "ORGANICO";
    if (m.includes("email") || m.includes("whatsapp")) return "DIRETO";
  }

  // Fallback: fonte (CV CRM portal name)
  if (!fonte) return "OUTRO";
  const f = norm(fonte);
  if (f.includes("facebook") || f.includes("meta") || f.includes("instagram") || f.includes("fb ads") || /\bfb\b/.test(f)) return "META";
  if (f.includes("google") || f.includes("busca paga") || f.includes("youtube") || f.includes("pmax") || f.includes("performance max")) return "GOOGLE";
  if (f.includes("organic") || f.includes("organico") || f.includes("seo")) return "ORGANICO";
  if (f.includes("indica") || f.includes("referral") || f.includes("referencia") || f.includes("parceiro")) return "INDICACAO";
  if (f.includes("direto") || f.includes("direct") || f.includes("whatsapp") || f.includes("site") || f.includes("email")) return "DIRETO";

  return "OUTRO";
}

type DadosCvJson = {
  estado?: string | null;
  conversaoOriginal?: string | null;
  midiaOriginal?: string | null;
} | null;

function parseDadosCv(raw: Prisma.JsonValue): DadosCvJson {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DadosCvJson;
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

  const leads = await prisma.leadCrm.findMany({
    where: { clienteId: id, dataEntrada: { gte: dateFrom, lte: dateTo } },
    select: { fonte: true, valor: true, dataFechamento: true, status: true, rating: true, dadosCv: true, etapa: true },
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
  };

  const emptyBucket = (): Bucket => ({
    leads: 0, ganhos: 0, perdidos: 0, andamento: 0, valor: 0, ratingSum: 0, ratingCount: 0, visitou: 0,
  });

  const fonteMap = new Map<string, Bucket>();
  const canalMap = new Map<string, Bucket>();
  const estadoMap = new Map<string, Bucket>();
  const conversaoMap = new Map<string, Bucket>();
  const campanhaMap = new Map<string, { canal: Canal } & Bucket>();

  let leadsComEstado = 0;
  let leadsComConversao = 0;

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

    const addTo = (map: Map<string, Bucket>, key: string) => {
      let b = map.get(key);
      if (!b) { b = emptyBucket(); map.set(key, b); }
      b.leads++;
      if (visitou) b.visitou++;
      if (isWon) { b.ganhos++; b.valor += valor; } else if (isLost) b.perdidos++; else b.andamento++;
      if (rating != null) { b.ratingSum += rating; b.ratingCount++; }
    };

    addTo(fonteMap, lead.fonte ?? "(sem fonte)");
    addTo(canalMap, canal);

    const estado = cv?.estado?.trim() || null;
    if (estado) { leadsComEstado++; addTo(estadoMap, estado); }

    const conversao = cv?.conversaoOriginal?.trim() || midiaOriginal || null;
    if (conversao) { leadsComConversao++; addTo(conversaoMap, conversao); }

    // porCampanha: group by conversaoOriginal (campaign/landing page) for paid-channel breakdown
    // Only track META and GOOGLE campaigns; others are handled in porCanal
    const conversaoKey = cv?.conversaoOriginal?.trim() ?? null;
    if (conversaoKey && (canal === "META" || canal === "GOOGLE")) {
      let b = campanhaMap.get(conversaoKey);
      if (!b) { b = { canal, ...emptyBucket() }; campanhaMap.set(conversaoKey, b); }
      b.leads++;
      if (visitou) b.visitou++;
      if (isWon) { b.ganhos++; b.valor += valor; } else if (isLost) b.perdidos++; else b.andamento++;
      if (rating != null) { b.ratingSum += rating; b.ratingCount++; }
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
    .map(([campanha, b]) => ({
      campanha, canal: b.canal,
      ...toRow(campanha, b),
      investCanal: b.canal === "META" ? investMeta : b.canal === "GOOGLE" ? investGoogle : null,
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

  return NextResponse.json({
    configured: true,
    periodo: { from: dateFrom, to: dateTo },
    totalLeads, totalGanhos, totalPerdidos, totalAndamento, totalValor,
    investMeta, investGoogle, leadsMeta, leadsGoogle, metaCrmLeads, googleCrmLeads,
    cplMetaCampanha: leadsMeta > 0 ? investMeta / leadsMeta : null,
    cplGoogleCampanha: leadsGoogle > 0 ? investGoogle / leadsGoogle : null,
    cplMetaCrm: metaCrmLeads > 0 ? investMeta / metaCrmLeads : null,
    cplGoogleCrm: googleCrmLeads > 0 ? investGoogle / googleCrmLeads : null,
    cacMetaCrm: metaGanhos > 0 && investMeta > 0 ? investMeta / metaGanhos : null,
    cacGoogleCrm: googleGanhos > 0 && investGoogle > 0 ? investGoogle / googleGanhos : null,
    porFonte, porCanal, porEstado, porConversao, porCampanha,
    leadsComEstado, leadsComConversao,
    ultimoSyncAt: config.ultimoSyncAt,
  });
}
