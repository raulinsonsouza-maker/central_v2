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
        ticketMedio: v.purchases > 0 ? v.faturamento / v.purchases : null,
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
      leads: number;
      purchases: number;
      faturamento: number;
      adCount: number;
    }>();

    for (const c of criativos) {
      const key = c.adsetId ?? "sem-conjunto";
      const existing = byConjunto.get(key);
      if (existing) {
        existing.spend += Number(c.spend);
        existing.impressions += c.impressions;
        existing.clicks += c.clicks;
        existing.leads += c.leads;
        existing.purchases += c.purchases;
        existing.faturamento += Number(c.websitePurchasesConversionValue);
        existing.adCount += 1;
      } else {
        byConjunto.set(key, {
          adsetId: c.adsetId ?? "",
          adsetName: c.adsetName ?? "Conjunto sem nome",
          spend: Number(c.spend),
          impressions: c.impressions,
          clicks: c.clicks,
          leads: c.leads,
          purchases: c.purchases,
          faturamento: Number(c.websitePurchasesConversionValue),
          adCount: 1,
        });
      }
    }

    const conjuntos = Array.from(byConjunto.values())
      .map((v) => ({
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : null,
        cpc: v.clicks > 0 ? v.spend / v.clicks : null,
        cpl: v.leads > 0 ? v.spend / v.leads : null,
        cpa: v.purchases > 0 ? v.spend / v.purchases : null,
        ticketMedio: v.purchases > 0 ? v.faturamento / v.purchases : null,
        roas: v.spend > 0 && v.faturamento > 0 ? v.faturamento / v.spend : null,
      }))
      .sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ nivel: "conjuntos", campanha, conjuntos });
  }

  if (nivel === "criativos" && campanha && conjunto) {
    // Fetch all daily rows for the adset in the period
    const rows = await prisma.metaAdsCriativo.findMany({
      where: {
        clienteId: id,
        data: { gte: dataInicio, lte: dataFim },
        campaignName: campanha,
        adsetId: conjunto,
      },
      orderBy: [{ data: "desc" }],
    });

    // Aggregate by adId — multiple rows exist (one per day) for the same creative
    const byAd = new Map<string, {
      adId: string; adName: string; mediaType: string;
      imageUrl: string | null; videoId: string | null;
      videoSourceUrl: string | null; videoPictureUrl: string | null;
      videoEmbedHtml: string | null; body: string | null; title: string | null;
      effectiveStatus: string | null; spend: number; impressions: number; clicks: number;
      leads: number; purchases: number; faturamento: number;
      daysActive: number;
    }>();

    for (const r of rows) {
      const existing = byAd.get(r.adId);
      if (existing) {
        existing.spend += Number(r.spend);
        existing.impressions += r.impressions;
        existing.clicks += r.clicks;
        existing.leads += r.leads;
        existing.purchases += r.purchases;
        existing.faturamento += Number(r.websitePurchasesConversionValue);
        existing.daysActive += 1;
        // Keep most recent (first row due to desc order) creative metadata
      } else {
        byAd.set(r.adId, {
          adId: r.adId,
          adName: r.adName,
          mediaType: r.mediaType,
          imageUrl: r.imageUrlFull ?? r.imageUrl ?? null,
          videoId: r.videoId ?? null,
          videoSourceUrl: r.videoSourceUrl ?? null,
          videoPictureUrl: r.videoPictureUrl ?? null,
          videoEmbedHtml: r.videoEmbedHtml ?? null,
          body: r.body ?? null,
          title: r.title ?? null,
          effectiveStatus: r.effectiveStatus ?? null,
          spend: Number(r.spend),
          impressions: r.impressions,
          clicks: r.clicks,
          leads: r.leads,
          purchases: r.purchases,
          faturamento: Number(r.websitePurchasesConversionValue),
          daysActive: 1,
        });
      }
    }

    const list = Array.from(byAd.values())
      .map((v) => ({
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : null,
        cpc: v.clicks > 0 ? v.spend / v.clicks : null,
        cpm: v.impressions > 0 ? (v.spend / v.impressions) * 1000 : null,
        cpl: v.leads > 0 ? v.spend / v.leads : null,
        cpa: v.purchases > 0 ? v.spend / v.purchases : null,
        ticketMedio: v.purchases > 0 ? v.faturamento / v.purchases : null,
        roas: v.spend > 0 && v.faturamento > 0 ? v.faturamento / v.spend : null,
      }))
      .sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ nivel: "criativos", campanha, conjunto, criativos: list });
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}
