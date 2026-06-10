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
    select: { etapa: true, valor: true, dataEntrada: true, dataFechamento: true },
  });

  const etapaMap = new Map<
    string,
    { etapa: string; count: number; valor: number; fechados: number }
  >();

  for (const lead of leads) {
    const entry = etapaMap.get(lead.etapa) ?? {
      etapa: lead.etapa,
      count: 0,
      valor: 0,
      fechados: 0,
    };
    entry.count++;
    entry.valor += lead.valor ? Number(lead.valor) : 0;
    if (lead.dataFechamento) entry.fechados++;
    etapaMap.set(lead.etapa, entry);
  }

  const etapas = Array.from(etapaMap.values()).sort((a, b) => b.count - a.count);

  const totalLeads = leads.length;
  const totalValor = etapas.reduce((s, e) => s + e.valor, 0);
  const totalFechados = etapas.reduce((s, e) => s + e.fechados, 0);

  return NextResponse.json({
    configured: true,
    tipo: config.tipo,
    ultimoSyncAt: config.ultimoSyncAt,
    totalLeads,
    totalValor,
    totalFechados,
    etapas,
  });
}
