import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

function canalFromFonte(
  fonte: string | null,
): "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO" {
  if (!fonte) return "OUTRO";
  const f = fonte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    f.includes("facebook") || f.includes("meta") || f.includes("instagram") ||
    f.includes("fb ads") || f.includes("meta ads") || f.includes("ig ads")
  ) return "META";

  if (
    f.includes("google") || f.includes("busca paga") || f.includes("youtube") ||
    f.includes("display") || f.includes("pmax") || f.includes("performance max")
  ) return "GOOGLE";

  if (
    f.includes("organic") || f.includes("organico") || f.includes("organica") ||
    f.includes("seo") || f.includes("busca organica") || f.includes("social organico")
  ) return "ORGANICO";

  if (
    f.includes("indica") || f.includes("referral") || f.includes("referencia") ||
    f.includes("parceiro") || f.includes("boca a boca")
  ) return "INDICACAO";

  if (
    f.includes("direto") || f.includes("direct") || f.includes("whatsapp") ||
    f.includes("site") || f.includes("landing") || f.includes("formulario") || f.includes("email")
  ) return "DIRETO";

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
  const dateTo = toParam ? new Date(toParam) : now;

  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { ativo: true, tipo: true, ultimoSyncAt: true },
  });
  if (!config?.ativo) {
    return NextResponse.json({ configured: false });
  }

  const leads = await prisma.leadCrm.findMany({
    where: { clienteId: id, dataEntrada: { gte: dateFrom, lte: dateTo } },
    select: { fonte: true, valor: true, dataFechamento: true, status: true, rating: true, dadosCv: true },
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
    valor: number; ratingSum: number; ratingCount: number;
  };

  const fonteMap = new Map<string, Bucket>();
  const canalMap = new Map<string, Bucket>();
  const estadoMap = new Map<string, Bucket>();
  const conversaoMap = new Map<string, Bucket>();

  let leadsComEstado = 0;
  let leadsComConversao = 0;

  for (const lead of leads) {
    const cv = parseDadosCv(lead.dadosCv);
    const isWon = lead.status === "won";
    const isLost = lead.status === "lost";
    const valor = lead.valor ? Number(lead.valor) : 0;
    const rating = lead.rating ?? null;

    const addTo = (map: Map<string, Bucket>, key: string) => {
      let b = map.get(key);
      if (!b) { b = { leads: 0, ganhos: 0, perdidos: 0, andamento: 0, valor: 0, ratingSum: 0, ratingCount: 0 }; map.set(key, b); }
      b.leads++;
      if (isWon) { b.ganhos++; b.valor += valor; } else if (isLost) b.perdidos++; else b.andamento++;
      if (rating != null) { b.ratingSum += rating; b.ratingCount++; }
    };

    addTo(fonteMap, lead.fonte ?? "(sem fonte)");
    addTo(canalMap, canalFromFonte(lead.fonte));

    const estado = cv?.estado?.trim() || null;
    if (estado) { leadsComEstado++; addTo(estadoMap, estado); }

    const conversao = cv?.conversaoOriginal?.trim() || cv?.midiaOriginal?.trim() || null;
    if (conversao) { leadsComConversao++; addTo(conversaoMap, conversao); }
  }

  const toRow = (key: string, b: Bucket) => ({
    key,
    leads: b.leads,
    ganhos: b.ganhos,
    perdidos: b.perdidos,
    andamento: b.andamento,
    valor: b.valor,
    taxaGanho: b.leads > 0 ? Math.round((b.ganhos / b.leads) * 100) : 0,
    taxaPerda: b.leads > 0 ? Math.round((b.perdidos / b.leads) * 100) : 0,
    ratingMedio: b.ratingCount > 0 ? Math.round((b.ratingSum / b.ratingCount) * 10) / 10 : null,
  });

  const porFonte = [...fonteMap.entries()]
    .map(([fonte, b]) => {
      const canal = canalFromFonte(fonte === "(sem fonte)" ? null : fonte);
      return {
        fonte, canal,
        ...toRow(fonte, b),
        investCanal: canal === "META" ? investMeta : canal === "GOOGLE" ? investGoogle : null,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const CANAL_ORDER = ["META", "GOOGLE", "ORGANICO", "INDICACAO", "DIRETO", "OUTRO"];
  const porCanal = [...canalMap.entries()]
    .map(([canal, b]) => ({
      canal, ...toRow(canal, b),
      investCanal: canal === "META" ? investMeta : canal === "GOOGLE" ? investGoogle : null,
    }))
    .sort((a, b) => CANAL_ORDER.indexOf(a.canal) - CANAL_ORDER.indexOf(b.canal));

  const porEstado = [...estadoMap.entries()]
    .map(([estado, b]) => ({ estado, ...toRow(estado, b) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 20);

  const porConversao = [...conversaoMap.entries()]
    .map(([conversao, b]) => ({ conversao, ...toRow(conversao, b) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 50);

  const totalLeads = leads.length;
  const totalGanhos = leads.filter((l) => l.status === "won").length;
  const totalPerdidos = leads.filter((l) => l.status === "lost").length;
  const totalAndamento = totalLeads - totalGanhos - totalPerdidos;
  const totalValor = leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.valor ? Number(l.valor) : 0), 0);
  const metaCrmLeads = porFonte.filter((f) => f.canal === "META").reduce((s, f) => s + f.leads, 0);
  const googleCrmLeads = porFonte.filter((f) => f.canal === "GOOGLE").reduce((s, f) => s + f.leads, 0);

  return NextResponse.json({
    configured: true,
    periodo: { from: dateFrom, to: dateTo },
    totalLeads, totalGanhos, totalPerdidos, totalAndamento, totalValor,
    investMeta, investGoogle, leadsMeta, leadsGoogle, metaCrmLeads, googleCrmLeads,
    cplMetaCampanha: leadsMeta > 0 ? investMeta / leadsMeta : null,
    cplGoogleCampanha: leadsGoogle > 0 ? investGoogle / leadsGoogle : null,
    cplMetaCrm: metaCrmLeads > 0 ? investMeta / metaCrmLeads : null,
    cplGoogleCrm: googleCrmLeads > 0 ? investGoogle / googleCrmLeads : null,
    porFonte, porCanal, porEstado, porConversao,
    leadsComEstado, leadsComConversao,
    ultimoSyncAt: config.ultimoSyncAt,
  });
}
