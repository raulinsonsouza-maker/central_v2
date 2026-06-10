import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Period = "month" | "3months" | "ytd" | "all";

function getDateFrom(period: Period): Date | undefined {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1);
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const period = (request.nextUrl.searchParams.get("period") ?? "all") as Period;
  const dateFrom = getDateFrom(period);

  const leads = await prisma.leadCrm.findMany({
    where: {
      clienteId: id,
      ...(dateFrom ? { dataEntrada: { gte: dateFrom } } : {}),
    },
    select: {
      id: true,
      crmLeadId: true,
      etapa: true,
      valor: true,
      dataEntrada: true,
      dataFechamento: true,
      email: true,
      telefone: true,
    },
    orderBy: { dataEntrada: "desc" },
    take: 500,
  });

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      crmLeadId: l.crmLeadId,
      etapa: l.etapa,
      valor: l.valor ? Number(l.valor) : null,
      dataEntrada: l.dataEntrada,
      dataFechamento: l.dataFechamento ?? null,
      contato: l.email ?? l.telefone ?? null,
    })),
    total: leads.length,
  });
}
