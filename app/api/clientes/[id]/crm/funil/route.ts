import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { id: true, tipo: true, ativo: true, ultimoSyncAt: true },
  });

  if (!config || !config.ativo) {
    return NextResponse.json({ configured: false });
  }

  const leads = await prisma.leadCrm.findMany({
    where: { clienteId: id },
    select: {
      etapa: true,
      ordemEtapa: true,
      valor: true,
      dataEntrada: true,
      dataFechamento: true,
    },
  });

  const etapaMap = new Map<
    string,
    {
      etapa: string;
      count: number;
      valor: number;
      fechados: number;
      minOrdem: number | null;
      minEntrada: Date;
    }
  >();

  for (const lead of leads) {
    const existing = etapaMap.get(lead.etapa);
    if (!existing) {
      etapaMap.set(lead.etapa, {
        etapa: lead.etapa,
        count: 1,
        valor: lead.valor ? Number(lead.valor) : 0,
        fechados: lead.dataFechamento ? 1 : 0,
        minOrdem: lead.ordemEtapa ?? null,
        minEntrada: lead.dataEntrada,
      });
    } else {
      existing.count++;
      existing.valor += lead.valor ? Number(lead.valor) : 0;
      if (lead.dataFechamento) existing.fechados++;
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

  const etapas = sorted.map((e, idx) => {
    const prevCount = idx > 0 ? sorted[idx - 1].count : null;
    const conversionFromPrev =
      prevCount != null && prevCount > 0
        ? Math.round((e.count / prevCount) * 100)
        : null;
    return {
      etapa: e.etapa,
      count: e.count,
      valor: e.valor,
      fechados: e.fechados,
      conversionFromPrev,
    };
  });

  const totalLeads = leads.length;
  const totalValor = [...etapaMap.values()].reduce((s, e) => s + e.valor, 0);
  const totalFechados = [...etapaMap.values()].reduce((s, e) => s + e.fechados, 0);
  const firstCount = sorted[0]?.count ?? 0;
  const lastCount = sorted[sorted.length - 1]?.count ?? 0;
  const overallConversion =
    firstCount > 0 && sorted.length > 1
      ? Math.round((lastCount / firstCount) * 100)
      : null;

  return NextResponse.json({
    configured: true,
    tipo: config.tipo,
    ultimoSyncAt: config.ultimoSyncAt,
    totalLeads,
    totalValor,
    totalFechados,
    overallConversion,
    etapas,
  });
}
