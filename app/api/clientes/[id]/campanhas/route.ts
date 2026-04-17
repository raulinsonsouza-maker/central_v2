import { NextRequest, NextResponse } from "next/server";
import { findClienteById } from "@/lib/repositories/clientesRepository";
import { prisma } from "@/lib/db";

function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const nivel = sp.get("nivel") ?? "campanhas";
  const campanha = sp.get("campanha") ?? null;
  const conjunto = sp.get("conjunto") ?? null;
  const canal = sp.get("canal") ?? "geral";
  const periodo = sp.get("periodo") ?? "90";
  const dataInicioParam = sp.get("dataInicio");
  const dataFimParam = sp.get("dataFim");

  const diasFallback = Math.min(365, Math.max(7, parseInt(periodo, 10) || 90));
  const dataFim = new Date();
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - diasFallback);

  if (dataInicioParam && dataFimParam) {
    const parsedInicio = parseDateOnly(dataInicioParam);
    const parsedFim = parseDateOnly(dataFimParam);
    if (parsedInicio && parsedFim && parsedInicio <= parsedFim) {
      dataInicio.setTime(parsedInicio.getTime());
      dataFim.setTime(parsedFim.getTime());
      dataFim.setHours(23, 59, 59, 999);
    }
  }

  const cliente = await findClienteById(id);
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const canalFilter = canal === "geral" ? undefined : canal.toUpperCase();

  if (nivel === "campanhas") {
    // Group FatoMidiaDiario by campaignName with full metrics
    const fatos = await prisma.fatoMidiaDiario.findMany({
      where: {
        clienteId: id,
        data: { gte: dataInicio, lte: dataFim },
        ...(canalFilter ? { canal: canalFilter } : {}),
        NOT: { campaignName: "" },
      },
    });

    const byCampanha = new Map<string, {
      investimento: number;
      impressoes: number;
      cliques: number;
      leads: number;
      purchases: number;
      faturamento: number;
    }>();

    for (const fato of fatos) {
      const nome = fato.campaignName.trim() || "Campanha sem nome";
      const existing = byCampanha.get(nome);
      if (existing) {
        existing.investimento += Number(fato.investimento);
        existing.impressoes += fato.impressoes;
        existing.cliques += fato.cliques;
        existing.leads += fato.leads;
        existing.purchases += fato.purchases;
        existing.faturamento += Number(fato.websitePurchasesConversionValue);
      } else {
        byCampanha.set(nome, {
          investimento: Number(fato.investimento),
          impressoes: fato.impressoes,
          cliques: fato.cliques,
          leads: fato.leads,
          purchases: fato.purchases,
          faturamento: Number(fato.websitePurchasesConversionValue),
        });
      }
    }

    const campanhas = Array.from(byCampanha.entries())
      .map(([nome, v]) => ({
        nome,
        investimento: v.investimento,
        impressoes: v.impressoes,
        cliques: v.cliques,
        leads: v.leads,
        purchases: v.purchases,
        faturamento: v.faturamento,
        cpl: v.leads > 0 ? v.investimento / v.leads : null,
        cpa: v.purchases > 0 ? v.investimento / v.purchases : null,
        roas: v.investimento > 0 && v.faturamento > 0 ? v.faturamento / v.investimento : null,
        ctr: v.impressoes > 0 ? (v.cliques / v.impressoes) * 100 : null,
      }))
      .sort((a, b) => b.investimento - a.investimento);

    return NextResponse.json({ nivel: "campanhas", campanhas });
  }

  if (nivel === "conjuntos" && campanha) {
    // Group MetaAdsCriativo by adsetId for the given campaign
    const criativos = await prisma.metaAdsCriativo.findMany({
      where: {
        clienteId: id,
        data: { gte: dataInicio, lte: dataFim },
        campaignName: campanha,
      },
    });

    const byConjunto = new Map<string, {
      adsetId: string;
      adsetName: string;
      spend: number;
      impressions: number;
      clicks: number;
      adCount: number;
    }>();

    for (const c of criativos) {
      const key = c.adsetId ?? "sem-conjunto";
      const existing = byConjunto.get(key);
      if (existing) {
        existing.spend += Number(c.spend);
        existing.impressions += c.impressions;
        existing.clicks += c.clicks;
        existing.adCount += 1;
      } else {
        byConjunto.set(key, {
          adsetId: c.adsetId ?? "",
          adsetName: c.adsetName ?? "Conjunto sem nome",
          spend: Number(c.spend),
          impressions: c.impressions,
          clicks: c.clicks,
          adCount: 1,
        });
      }
    }

    const conjuntos = Array.from(byConjunto.values())
      .map((v) => ({
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : null,
        cpc: v.clicks > 0 ? v.spend / v.clicks : null,
      }))
      .sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ nivel: "conjuntos", campanha, conjuntos });
  }

  if (nivel === "criativos" && campanha && conjunto) {
    // Individual ad creatives for the given adset
    const criativos = await prisma.metaAdsCriativo.findMany({
      where: {
        clienteId: id,
        data: { gte: dataInicio, lte: dataFim },
        campaignName: campanha,
        adsetId: conjunto,
      },
      orderBy: [{ spend: "desc" }],
    });

    const list = criativos.map((c) => ({
      adId: c.adId,
      adName: c.adName,
      mediaType: c.mediaType,
      imageUrl: c.imageUrlFull ?? c.imageUrl ?? null,
      videoId: c.videoId ?? null,
      videoSourceUrl: c.videoSourceUrl ?? null,
      videoPictureUrl: c.videoPictureUrl ?? null,
      videoEmbedHtml: c.videoEmbedHtml ?? null,
      body: c.body ?? null,
      title: c.title ?? null,
      spend: Number(c.spend),
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr ? Number(c.ctr) : c.impressions > 0 ? (c.clicks / c.impressions) * 100 : null,
      cpc: c.cpc ? Number(c.cpc) : null,
      effectiveStatus: c.effectiveStatus ?? null,
    }));

    return NextResponse.json({ nivel: "criativos", campanha, conjunto, criativos: list });
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}
