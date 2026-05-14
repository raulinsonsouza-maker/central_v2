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
      conversas: number;
      profileVisits: number;
      diasAtivos: Set<string>;
    }>();

    for (const fato of fatos) {
      const nome = fato.campaignName.trim() || "Campanha sem nome";
      const dateKey = fato.data.toISOString().slice(0, 10);
      const existing = byCampanha.get(nome);
      if (existing) {
        existing.investimento += Number(fato.investimento);
        existing.impressoes += fato.impressoes;
        existing.cliques += fato.cliques;
        existing.leads += fato.leads;
        existing.purchases += fato.purchases;
        existing.faturamento += Number(fato.websitePurchasesConversionValue);
        existing.conversas += fato.messagingConversationsStarted ?? 0;
        existing.profileVisits += (fato as { profileVisits?: number }).profileVisits ?? 0;
        if (Number(fato.investimento) > 0) existing.diasAtivos.add(dateKey);
      } else {
        byCampanha.set(nome, {
          investimento: Number(fato.investimento),
          impressoes: fato.impressoes,
          cliques: fato.cliques,
          leads: fato.leads,
          purchases: fato.purchases,
          faturamento: Number(fato.websitePurchasesConversionValue),
          conversas: fato.messagingConversationsStarted ?? 0,
          profileVisits: (fato as { profileVisits?: number }).profileVisits ?? 0,
          diasAtivos: Number(fato.investimento) > 0 ? new Set([dateKey]) : new Set(),
        });
      }
    }

    // Derive campaign status from the most recent MetaAdsCriativo effectiveStatus per ad.
    // A campaign is ATIVA if any of its ads is currently ACTIVE (in its latest record).
    const allCreatives = await prisma.metaAdsCriativo.findMany({
      where: { clienteId: id },
      select: { campaignName: true, effectiveStatus: true, data: true, adId: true },
      orderBy: { data: "desc" },
    });

    // Step 1: keep only the most recent record per adId (sync writes one row per day per ad).
    const latestPerAd = new Map<string, typeof allCreatives[0]>();
    for (const c of allCreatives) {
      const prev = latestPerAd.get(c.adId);
      if (!prev || c.data > prev.data) latestPerAd.set(c.adId, c);
    }

    // Step 2: derive campaign status from the deduped latest-per-ad records.
    const campaignStatusMap = new Map<string, string>();
    for (const c of latestPerAd.values()) {
      const name = (c.campaignName ?? "").trim();
      if (!name) continue;
      if (c.effectiveStatus === "ACTIVE") {
        campaignStatusMap.set(name, "ATIVA");
      } else if (!campaignStatusMap.has(name)) {
        campaignStatusMap.set(name, "PAUSADA");
      }
    }

    // Derive result type and primary metric per campaign
    type ResultType = "vendas" | "leads" | "conversas" | "visitas" | "alcance";
    function deriveResultType(v: { purchases: number; leads: number; conversas: number; profileVisits: number }, nome: string): ResultType {
      if (v.purchases > 0) return "vendas";
      if (v.leads > 0) return "leads";
      // When a campaign has both profileVisits and conversas, the dominant metric wins.
      // Instagram engagement campaigns often register a few incidental conversas alongside many profileVisits.
      if (v.profileVisits > v.conversas) return "visitas";
      if (v.conversas > 0) return "conversas";
      if (v.profileVisits > 0) return "visitas";
      const n = nome.toLowerCase();
      if (/whatsapp|mensagem|message/.test(n)) return "conversas";
      if (/instagram|perfil|engajamento|engagement|alcance|reach|awareness/.test(n)) return "alcance";
      return "alcance";
    }

    const campanhas = Array.from(byCampanha.entries())
      .map(([nome, v]) => {
        const resultType = deriveResultType(v, nome);
        const resultados = resultType === "vendas" ? v.purchases : resultType === "leads" ? v.leads : resultType === "conversas" ? v.conversas : resultType === "visitas" ? v.profileVisits : null;
        const custoResultado = resultados && resultados > 0 ? v.investimento / resultados : null;
        return {
          nome,
          status: campaignStatusMap.get(nome) ?? null,
          diasAtivos: v.diasAtivos.size,
          investimento: v.investimento,
          impressoes: v.impressoes,
          cliques: v.cliques,
          leads: v.leads,
          purchases: v.purchases,
          faturamento: v.faturamento,
          conversas: v.conversas,
          profileVisits: v.profileVisits,
          resultType,
          resultados,
          custoResultado,
          cpl: v.leads > 0 ? v.investimento / v.leads : null,
          cpa: v.purchases > 0 ? v.investimento / v.purchases : null,
          ticketMedio: v.purchases > 0 ? v.faturamento / v.purchases : null,
          roas: v.investimento > 0 && v.faturamento > 0 ? v.faturamento / v.investimento : null,
          ctr: v.impressoes > 0 ? (v.cliques / v.impressoes) * 100 : null,
        };
      })
      .filter(c => c.investimento > 1)
      .sort((a, b) => b.investimento - a.investimento);

    return NextResponse.json({ nivel: "campanhas", campanhas });
  }

  if (nivel === "conjuntos" && campanha) {
    // Fetch all rows for this campaign (no date filter) and aggregate by adset.
    // Using all rows means cumulative data across the full sync window.
    const criativos = await prisma.metaAdsCriativo.findMany({
      where: {
        clienteId: id,
        campaignName: campanha,
      },
      orderBy: { data: "desc" },
    });

    // De-dup to latest row per adId (sync stores cumulative rows daily —
    // taking the most recent avoids double-counting).
    const latestPerAd = new Map<string, typeof criativos[0]>();
    for (const c of criativos) {
      const prev = latestPerAd.get(c.adId);
      if (!prev || c.data > prev.data) latestPerAd.set(c.adId, c);
    }

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

    for (const c of latestPerAd.values()) {
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
    // Fetch all rows for this adset (no date filter) ordered by date desc.
    const rows = await prisma.metaAdsCriativo.findMany({
      where: {
        clienteId: id,
        campaignName: campanha,
        adsetId: conjunto,
      },
      orderBy: [{ data: "desc" }],
    });

    // De-dup to latest row per adId to avoid double-counting cumulative records.
    const latestPerAd = new Map<string, typeof rows[0]>();
    for (const r of rows) {
      const prev = latestPerAd.get(r.adId);
      if (!prev || r.data > prev.data) latestPerAd.set(r.adId, r);
    }

    // Map by adId — one entry per ad
    const byAd = new Map<string, {
      adId: string; adName: string; mediaType: string;
      imageUrl: string | null; videoId: string | null;
      videoSourceUrl: string | null; videoPictureUrl: string | null;
      videoEmbedHtml: string | null; body: string | null; title: string | null;
      effectiveStatus: string | null; spend: number; impressions: number; clicks: number;
      leads: number; purchases: number; faturamento: number;
      daysActive: number;
    }>();

    for (const r of latestPerAd.values()) {
      const existing = byAd.get(r.adId);
      if (existing) {
        // shouldn't happen since latestPerAd already has one entry per adId
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
