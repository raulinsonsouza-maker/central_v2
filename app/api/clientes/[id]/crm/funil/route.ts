import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTagFilter, buildTagFilterWhere } from "@/lib/crm/tagFilter";
import { buildLeadFilterWhere } from "@/lib/crm/canalFilter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const filterType  = url.searchParams.get("filterType");
  const filterValue = url.searchParams.get("filterValue");

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const dateFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const dateTo = toParam
    ? (() => { const d = new Date(toParam); d.setHours(23, 59, 59, 999); return d; })()
    : now;

  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { id: true, tipo: true, ativo: true, ultimoSyncAt: true },
  });

  if (!config || !config.ativo) {
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
    select: {
      etapa: true,
      ordemEtapa: true,
      valor: true,
      dataEntrada: true,
      dataFechamento: true,
      status: true,
    },
  });

  const etapaMap = new Map<
    string,
    {
      etapa: string;
      count: number;
      valor: number;
      fechados: number;
      ganhos: number;
      minOrdem: number | null;
      minEntrada: Date;
    }
  >();

  for (const lead of leads) {
    const existing = etapaMap.get(lead.etapa);
    const isWon = lead.status === "won";
    if (!existing) {
      etapaMap.set(lead.etapa, {
        etapa: lead.etapa,
        count: 1,
        valor: lead.valor ? Number(lead.valor) : 0,
        fechados: lead.dataFechamento ? 1 : 0,
        ganhos: isWon ? 1 : 0,
        minOrdem: lead.ordemEtapa ?? null,
        minEntrada: lead.dataEntrada,
      });
    } else {
      existing.count++;
      existing.valor += lead.valor ? Number(lead.valor) : 0;
      if (lead.dataFechamento) existing.fechados++;
      if (isWon) existing.ganhos++;
      if (
        lead.ordemEtapa != null &&
        (existing.minOrdem == null || lead.ordemEtapa < existing.minOrdem)
      ) {
        existing.minOrdem = lead.ordemEtapa;
      }
      if (lead.dataEntrada < existing.minEntrada) {
        existing.minEntrada = lead.dataEntrada;
      }
    }
  }

  const sorted = [...etapaMap.values()].sort((a, b) => {
    if (a.minOrdem != null && b.minOrdem != null) return a.minOrdem - b.minOrdem;
    if (a.minOrdem != null) return -1;
    if (b.minOrdem != null) return 1;
    return a.minEntrada.getTime() - b.minEntrada.getTime();
  });

  const totalLeads = leads.length;
  const totalValor = sorted.reduce((s, e) => s + e.valor, 0);
  const totalFechados = sorted.reduce((s, e) => s + e.fechados, 0);
  const totalGanhos = sorted.reduce((s, e) => s + e.ganhos, 0);

  const etapas = sorted.map((e) => ({
    etapa: e.etapa,
    count: e.count,
    valor: e.valor,
    fechados: e.fechados,
    ganhos: e.ganhos,
    pctTotal: totalLeads > 0 ? Math.round((e.count / totalLeads) * 1000) / 10 : 0,
  }));

  return NextResponse.json({
    configured: true,
    tipo: config.tipo,
    ultimoSyncAt: config.ultimoSyncAt,
    totalLeads,
    totalValor,
    totalFechados,
    totalGanhos,
    etapas,
  });
}
