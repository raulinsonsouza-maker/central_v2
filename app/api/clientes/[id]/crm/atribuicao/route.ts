import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/clientes/[id]/crm/atribuicao
 *
 * Agrupa leads CRM por fonte e cruza com investimento de mídia (Meta + Google)
 * no mesmo período para calcular CPL real e taxa de fechamento por canal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;

  // Período: padrão = YTD
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const dateFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const dateTo = toParam ? new Date(toParam) : now;

  // Verifica se CRM está configurado
  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { ativo: true, tipo: true, ultimoSyncAt: true },
  });
  if (!config?.ativo) {
    return NextResponse.json({ configured: false });
  }

  // Busca todos os leads no período
  const leads = await prisma.leadCrm.findMany({
    where: { clienteId: id, dataEntrada: { gte: dateFrom, lte: dateTo } },
    select: { fonte: true, valor: true, dataFechamento: true, rating: true },
  });

  // Busca investimento de mídia no período (META e GOOGLE)
  const fatoRows = await prisma.fatoMidiaDiario.findMany({
    where: {
      clienteId: id,
      data: { gte: dateFrom, lte: dateTo },
      canal: { in: ["META", "GOOGLE"] },
    },
    select: { canal: true, investimento: true, leads: true, conversoes: true },
  });

  // Soma investimento por canal de mídia
  const investMeta = fatoRows
    .filter((r) => r.canal === "META")
    .reduce((s, r) => s + Number(r.investimento), 0);
  const investGoogle = fatoRows
    .filter((r) => r.canal === "GOOGLE")
    .reduce((s, r) => s + Number(r.investimento), 0);
  const leadsMeta = fatoRows
    .filter((r) => r.canal === "META")
    .reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);
  const leadsGoogle = fatoRows
    .filter((r) => r.canal === "GOOGLE")
    .reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);

  // Classifica fonte em canal de mídia
  function canalFromFonte(fonte: string | null): "META" | "GOOGLE" | "ORGANICO" | "OUTRO" {
    if (!fonte) return "OUTRO";
    const f = fonte.toLowerCase();
    if (f.includes("facebook") || f.includes("meta") || f.includes("instagram")) return "META";
    if (f.includes("google") || f.includes("busca paga | google")) return "GOOGLE";
    if (f.includes("orgân") || f.includes("organic") || f.includes("busca orgânica")) return "ORGANICO";
    return "OUTRO";
  }

  // Agrupa por fonte
  const fonteMap = new Map<
    string,
    { leads: number; fechados: number; valor: number; ratingSum: number; ratingCount: number }
  >();

  for (const lead of leads) {
    const key = lead.fonte ?? "(sem fonte)";
    const existing = fonteMap.get(key);
    const isFechado = lead.dataFechamento != null;
    const val = lead.valor ? Number(lead.valor) : 0;
    const rat = lead.rating != null ? lead.rating : null;

    if (!existing) {
      fonteMap.set(key, {
        leads: 1,
        fechados: isFechado ? 1 : 0,
        valor: val,
        ratingSum: rat ?? 0,
        ratingCount: rat != null ? 1 : 0,
      });
    } else {
      existing.leads++;
      if (isFechado) existing.fechados++;
      existing.valor += val;
      if (rat != null) {
        existing.ratingSum += rat;
        existing.ratingCount++;
      }
    }
  }

  // Monta resultado por fonte, ordenado por nº de leads
  const porFonte = [...fonteMap.entries()]
    .map(([fonte, agg]) => {
      const canal = canalFromFonte(fonte === "(sem fonte)" ? null : fonte);
      const invest =
        canal === "META" ? investMeta :
        canal === "GOOGLE" ? investGoogle :
        null;

      return {
        fonte,
        canal,
        leads: agg.leads,
        fechados: agg.fechados,
        valor: agg.valor,
        taxaFechamento: agg.leads > 0 ? Math.round((agg.fechados / agg.leads) * 100) : 0,
        ratingMedio: agg.ratingCount > 0 ? Math.round((agg.ratingSum / agg.ratingCount) * 10) / 10 : null,
        // CPL real só faz sentido para canais pagos — divide o investimento proporcional pelo nº de CRM leads
        // (nota: aproximação; o invest é do canal todo, não só dessa fonte)
        investCanal: invest,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // Totais globais
  const totalLeads = leads.length;
  const totalFechados = leads.filter((l) => l.dataFechamento != null).length;
  const totalValor = leads.reduce((s, l) => s + (l.valor ? Number(l.valor) : 0), 0);

  return NextResponse.json({
    configured: true,
    periodo: { from: dateFrom, to: dateTo },
    totalLeads,
    totalFechados,
    totalValor,
    investMeta,
    investGoogle,
    leadsMeta,
    leadsGoogle,
    porFonte,
    ultimoSyncAt: config.ultimoSyncAt,
  });
}
