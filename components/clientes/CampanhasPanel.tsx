"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ArrowLeft, BarChart3, Play, Target, Eye, MousePointerClick, Wallet, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { upgradeFbCdnImageUrl } from "@/lib/utils";

type DateFilter = {
  periodo: string;
  dataInicio?: string;
  dataFim?: string;
};

function buildParams(filter: DateFilter, extra: Record<string, string>) {
  const p = new URLSearchParams();
  p.set("periodo", filter.periodo);
  if (filter.dataInicio) p.set("dataInicio", filter.dataInicio);
  if (filter.dataFim) p.set("dataFim", filter.dataFim);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

function fmt(v: number, decimals = 0) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtBrl(v: number) {
  return "R$\u00a0" + fmt(v, 2);
}
function fmtPct(v: number) {
  return fmt(v, 2) + "%";
}

interface Campanha {
  nome: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  purchases: number;
  faturamento: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  ctr: number | null;
}

interface Conjunto {
  adsetId: string;
  adsetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  adCount: number;
  ctr: number | null;
  cpc: number | null;
}

interface Criativo {
  adId: string;
  adName: string;
  mediaType: string;
  imageUrl: string | null;
  videoId: string | null;
  videoSourceUrl: string | null;
  videoPictureUrl: string | null;
  body: string | null;
  title: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  effectiveStatus: string | null;
}

function StatBadge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{value}</span>
    </div>
  );
}

function CampanhaRow({ c, rank, onClick }: { c: Campanha; rank: number; onClick: () => void }) {
  const hasSales = c.purchases > 0 || c.faturamento > 0;
  const hasLeads = c.leads > 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left group hover:bg-[var(--primary)]/5 transition-colors rounded-xl px-4 py-3 border border-white/5 hover:border-[var(--primary)]/20 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-[var(--muted-foreground)] mt-0.5 min-w-[20px]">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--foreground)] leading-snug break-words">{c.nome}</span>
            <span className="text-[10px] bg-white/5 text-[var(--muted-foreground)] px-1.5 py-0.5 rounded">
              {fmtBrl(c.investimento)} investido
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <StatBadge label="Impressões" value={fmt(c.impressoes)} />
            <StatBadge label="Cliques" value={fmt(c.cliques)} />
            {c.ctr !== null && <StatBadge label="CTR" value={fmtPct(c.ctr)} />}
            {hasLeads && <StatBadge label="Leads" value={fmt(c.leads)} />}
            {c.cpl !== null && <StatBadge label="CPL" value={fmtBrl(c.cpl)} />}
            {hasSales && <StatBadge label="Vendas" value={fmt(c.purchases)} accent />}
            {hasSales && c.faturamento > 0 && <StatBadge label="Faturado" value={fmtBrl(c.faturamento)} accent />}
            {c.roas !== null && <StatBadge label="ROAS" value={fmt(c.roas, 2) + "x"} />}
            {c.cpa !== null && <StatBadge label="Custo/Venda" value={fmtBrl(c.cpa)} />}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors mt-1 flex-shrink-0" />
      </div>
    </button>
  );
}

function ConjuntoRow({ c, rank, onClick }: { c: Conjunto; rank: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left group hover:bg-[var(--primary)]/5 transition-colors rounded-xl px-4 py-3 border border-white/5 hover:border-[var(--primary)]/20 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-[var(--muted-foreground)] mt-0.5 min-w-[20px]">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--foreground)] leading-snug break-words">{c.adsetName}</span>
            <span className="text-[10px] bg-white/5 text-[var(--muted-foreground)] px-1.5 py-0.5 rounded">
              {c.adCount} {c.adCount === 1 ? "anúncio" : "anúncios"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <StatBadge label="Investido" value={fmtBrl(c.spend)} />
            <StatBadge label="Impressões" value={fmt(c.impressions)} />
            <StatBadge label="Cliques" value={fmt(c.clicks)} />
            {c.ctr !== null && <StatBadge label="CTR" value={fmtPct(c.ctr)} />}
            {c.cpc !== null && <StatBadge label="CPC" value={fmtBrl(c.cpc)} />}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors mt-1 flex-shrink-0" />
      </div>
    </button>
  );
}

function CriativoCard({ c }: { c: Criativo }) {
  const [videoError, setVideoError] = React.useState(false);
  const thumb = c.videoPictureUrl ?? c.imageUrl;
  const thumbUpgraded = thumb ? upgradeFbCdnImageUrl(thumb) : null;
  const isVideo = c.mediaType === "VIDEO";
  const isActive = c.effectiveStatus === "ACTIVE";

  return (
    <div className="rounded-xl border border-white/8 bg-[var(--card)] overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-black/30 overflow-hidden flex-shrink-0">
        {isVideo && c.videoSourceUrl && !videoError ? (
          <video
            src={c.videoSourceUrl}
            poster={thumbUpgraded ?? undefined}
            controls
            className="w-full h-full object-cover"
            onError={() => setVideoError(true)}
          />
        ) : thumbUpgraded ? (
          <img
            src={thumbUpgraded}
            alt={c.adName}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">
            {isVideo ? <Play className="w-10 h-10 opacity-30" /> : <Eye className="w-10 h-10 opacity-30" />}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isVideo && (
            <span className="text-[10px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
              <Play className="w-2.5 h-2.5" /> Vídeo
            </span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-[var(--muted-foreground)]"}`}>
            {isActive ? "Ativo" : (c.effectiveStatus ?? "—")}
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">{c.adName}</p>
        {(c.title || c.body) && (
          <div className="text-[11px] text-[var(--muted-foreground)] space-y-0.5">
            {c.title && <p className="font-medium text-[var(--foreground)]/80 line-clamp-1">{c.title}</p>}
            {c.body && <p className="line-clamp-2">{c.body}</p>}
          </div>
        )}
        <div className="mt-auto pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/5">
          <StatBadge label="Investido" value={fmtBrl(c.spend)} />
          <StatBadge label="Impressões" value={fmt(c.impressions)} />
          <StatBadge label="Cliques" value={fmt(c.clicks)} />
          {c.ctr !== null && <StatBadge label="CTR" value={fmtPct(c.ctr)} />}
          {c.cpc !== null && <StatBadge label="CPC" value={fmtBrl(c.cpc)} />}
        </div>
      </div>
    </div>
  );
}

interface Props {
  clienteId: string;
  dateFilter: DateFilter;
  canal?: string;
}

export function CampanhasPanel({ clienteId, dateFilter, canal = "geral" }: Props) {
  const [selectedCampanha, setSelectedCampanha] = React.useState<string | null>(null);
  const [selectedConjunto, setSelectedConjunto] = React.useState<string | null>(null);

  const nivel = selectedConjunto ? "criativos" : selectedCampanha ? "conjuntos" : "campanhas";

  const params = buildParams(dateFilter, {
    canal,
    nivel,
    ...(selectedCampanha ? { campanha: selectedCampanha } : {}),
    ...(selectedConjunto ? { conjunto: selectedConjunto } : {}),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campanhas", clienteId, nivel, selectedCampanha, selectedConjunto, dateFilter],
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${clienteId}/campanhas?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar campanhas");
      return res.json();
    },
  });

  function goBack() {
    if (selectedConjunto) {
      setSelectedConjunto(null);
    } else {
      setSelectedCampanha(null);
    }
  }

  const campanhas: Campanha[] = data?.campanhas ?? [];
  const conjuntos: Conjunto[] = data?.conjuntos ?? [];
  const criativos: Criativo[] = data?.criativos ?? [];

  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-[var(--card)] to-[var(--card)]/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
        {nivel !== "campanhas" && (
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] flex-wrap">
            <button
              onClick={() => { setSelectedCampanha(null); setSelectedConjunto(null); }}
              className={`hover:text-[var(--foreground)] transition-colors ${nivel === "campanhas" ? "text-[var(--foreground)] font-semibold" : ""}`}
            >
              Campanhas
            </button>
            {selectedCampanha && (
              <>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <button
                  onClick={() => setSelectedConjunto(null)}
                  className={`hover:text-[var(--foreground)] transition-colors truncate max-w-[180px] ${nivel === "conjuntos" ? "text-[var(--foreground)] font-semibold" : ""}`}
                >
                  {selectedCampanha}
                </button>
              </>
            )}
            {selectedConjunto && data?.conjunto && (
              <>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-[var(--foreground)] font-semibold truncate max-w-[180px]">
                  {conjuntos.find(c => c.adsetId === selectedConjunto)?.adsetName ?? "Conjunto"}
                </span>
              </>
            )}
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)] mt-0.5 flex items-center gap-2">
            {nivel === "campanhas" && (
              <><BarChart3 className="w-4 h-4 text-[var(--primary)]" /> Campanhas</>
            )}
            {nivel === "conjuntos" && (
              <><Target className="w-4 h-4 text-[var(--primary)]" /> Conjuntos de Anúncios</>
            )}
            {nivel === "criativos" && (
              <><Eye className="w-4 h-4 text-[var(--primary)]" /> Criativos</>
            )}
          </h3>
        </div>
        {nivel === "campanhas" && campanhas.length > 0 && (
          <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full font-semibold">
            {campanhas.length} campanha{campanhas.length !== 1 ? "s" : ""}
          </span>
        )}
        {nivel === "conjuntos" && conjuntos.length > 0 && (
          <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full font-semibold">
            {conjuntos.length} conjunto{conjuntos.length !== 1 ? "s" : ""}
          </span>
        )}
        {nivel === "criativos" && criativos.length > 0 && (
          <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full font-semibold">
            {criativos.length} criativo{criativos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)] text-sm gap-2">
            <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            Carregando…
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
            Erro ao carregar dados. Tente novamente.
          </div>
        )}

        {!isLoading && !isError && nivel === "campanhas" && (
          campanhas.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)] text-sm">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma campanha encontrada no período.</p>
              <p className="text-xs mt-1 opacity-70">Os dados aparecem após o próximo sync.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {campanhas.map((c, i) => (
                <CampanhaRow
                  key={c.nome}
                  c={c}
                  rank={i + 1}
                  onClick={() => setSelectedCampanha(c.nome)}
                />
              ))}
            </div>
          )
        )}

        {!isLoading && !isError && nivel === "conjuntos" && (
          conjuntos.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)] text-sm">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum conjunto encontrado para esta campanha.</p>
              <p className="text-xs mt-1 opacity-70">Os conjuntos aparecem após o próximo sync de criativos.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {conjuntos.map((c, i) => (
                <ConjuntoRow
                  key={c.adsetId}
                  c={c}
                  rank={i + 1}
                  onClick={() => setSelectedConjunto(c.adsetId)}
                />
              ))}
            </div>
          )
        )}

        {!isLoading && !isError && nivel === "criativos" && (
          criativos.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)] text-sm">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum criativo encontrado para este conjunto.</p>
              <p className="text-xs mt-1 opacity-70">Os criativos aparecem após o próximo sync.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {criativos.map((c) => (
                <CriativoCard key={c.adId} c={c} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
