import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    select: { etapa: true, ordemEtapa: true, valor: true, dataEntrada: true, dataFechamento: true },
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
      if (lead.ordemEtapa != null && (existing.minOrdem == null || lead.ordemEtapa < existing.minOrdem)) {
        existing.minOrdem = lead.ordemEtapa;
      }
      if (lead.dataEntrada < existing.minEntrada) {
        existing.minEntrada = lead.dataEntrada;
      }
    }
  }

  const sorted = Array.from(etapaMap.values()).sort((a, b) => {
    if (a.minOrdem != null && b.minOrdem != null) return a.minOrdem - b.minOrdem;
    if (a.minOrdem != null) return -1;
    if (b.minOrdem != null) return 1;
    return a.minEntrada.getTime() - b.minEntrada.getTime();
  });

  const etapas = sorted.map((e, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const conversionFromPrev =
      prev && prev.count > 0 ? Math.round((e.count / prev.count) * 1000) / 10 : null;
    return {
      etapa: e.etapa,
      count: e.count,
      valor: e.valor,
      fechados: e.fechados,
      conversionFromPrev,
    };
  });

  const totalLeads = leads.length;
  const totalValor = sorted.reduce((s, e) => s + e.valor, 0);
  const totalFechados = sorted.reduce((s, e) => s + e.fechados, 0);

  const overallConversion =
    etapas.length >= 2 && sorted[0].count > 0
      ? Math.round((sorted[sorted.length - 1].count / sorted[0].count) * 1000) / 10
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
