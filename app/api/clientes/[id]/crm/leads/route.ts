import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

function buildCanalFonteOR(canal: string): Prisma.LeadCrmWhereInput[] {
  const patterns: Record<string, string[]> = {
    META:      ["facebook", "meta", "instagram"],
    GOOGLE:    ["google", "youtube", "pmax", "busca paga", "performance max"],
    ORGANICO:  ["orgânico", "organico", "organic", "seo"],
    INDICACAO: ["indicação", "indicacao", "referral", "indica"],
    DIRETO:    ["direto", "direct", "whatsapp", "site"],
  };
  const ps = patterns[canal] ?? [];
  return ps.map((p) => ({ fonte: { contains: p, mode: "insensitive" as const } }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "15", 10)));
  const search = url.searchParams.get("search")?.trim() ?? "";

  const filterType  = url.searchParams.get("filterType");
  const filterValue = url.searchParams.get("filterValue");

  let filterCondition: Prisma.LeadCrmWhereInput = {};
  if (filterType && filterValue) {
    if (filterType === "canal") {
      if (filterValue === "META_CONFIRMED") {
        filterCondition = { metaLeadId: { not: null } };
      } else if (filterValue === "META_CRM") {
        const or = buildCanalFonteOR("META");
        filterCondition = or.length > 0 ? { metaLeadId: null, OR: or } : { metaLeadId: null };
      } else {
        const or = buildCanalFonteOR(filterValue);
        if (or.length > 0) filterCondition = { OR: or };
      }
    } else if (filterType === "estado") {
      filterCondition = { dadosCv: { path: ["estado"], equals: filterValue } };
    } else if (filterType === "conversao") {
      filterCondition = { dadosCv: { path: ["conversaoOriginal"], equals: filterValue } };
    }
  }

  // Support both ?from=YYYY-MM-DD&to=YYYY-MM-DD and legacy ?period= param
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  if (fromParam) {
    dateFrom = new Date(fromParam);
  } else {
    // Legacy period support
    const period = url.searchParams.get("period") ?? "all";
    const now = new Date();
    if (period === "month") dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === "3months") {
      const d = new Date(); d.setMonth(d.getMonth() - 3); dateFrom = d;
    } else if (period === "ytd") dateFrom = new Date(now.getFullYear(), 0, 1);
  }

  if (toParam) {
    dateTo = new Date(toParam);
    // Include the full end day
    dateTo.setHours(23, 59, 59, 999);
  }

  const where: Prisma.LeadCrmWhereInput = {
    clienteId: id,
    ...(dateFrom || dateTo
      ? {
          dataEntrada: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { telefone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...filterCondition,
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
      fonte: l.fonte ?? null,
      rating: l.rating ?? null,
      status: l.status ?? null,
      dadosMarketing: l.dadosMarketing ?? null,
      dadosCv: l.dadosCv ?? null,
    })),
    total,
    page,
    pageSize,
  });
}
