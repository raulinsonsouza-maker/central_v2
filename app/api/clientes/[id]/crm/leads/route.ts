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
  const url = request.nextUrl;
  const period = (url.searchParams.get("period") ?? "all") as Period;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "15", 10)));
  const search = url.searchParams.get("search")?.trim() ?? "";

  const dateFrom = getDateFrom(period);

  const where = {
    clienteId: id,
    ...(dateFrom ? { dataEntrada: { gte: dateFrom } } : {}),
    ...(search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { telefone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.leadCrm.findMany({
      where,
      select: {
        id: true,
        crmLeadId: true,
        etapa: true,
        valor: true,
        dataEntrada: true,
        dataFechamento: true,
        nome: true,
        email: true,
        telefone: true,
        fonte: true,
        rating: true,
        status: true,
        dadosMarketing: true,
        dadosCv: true,
      },
      orderBy: { dataEntrada: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leadCrm.count({ where }),
  ]);

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      crmLeadId: l.crmLeadId,
      etapa: l.etapa,
      valor: l.valor ? Number(l.valor) : null,
      dataEntrada: l.dataEntrada,
      dataFechamento: l.dataFechamento ?? null,
      nome: l.nome ?? null,
      email: l.email ?? null,
      telefone: l.telefone ?? null,
      contato: l.nome ?? l.email ?? l.telefone ?? null,
      fonte: l.fonte ?? null,
      rating: l.rating ?? null,
      status: l.status ?? null,
      dadosMarketing: (l.dadosMarketing as Record<string, unknown> | null) ?? null,
      dadosCv: (l.dadosCv as Record<string, unknown> | null) ?? null,
    })),
    total,
    page,
    pageSize,
  });
}
