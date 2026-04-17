"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ArrowLeft, BarChart3, Play, Target, Eye } from "lucide-react";
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

interface MetricCellProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function MetricCell({ label, value, highlight }: MetricCellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
        {value}
      </span>
    </div>
  );
}

function CampanhaRow({ c, rank, isLast, onClick }: { c: Campanha; rank: number; isLast?: boolean; onClick: () => void }) {
  const hasSales = c.purchases > 0 || c.faturamento > 0;
  const hasLeads = c.leads > 0;
  const isTop = rank === 1;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group transition-all duration-150 hover:bg-[var(--primary)]/[0.04] relative ${!isLast ? "border-b border-white/[0.05]" : ""}`}
    >
      {/* Orange left accent for top campaign */}
      {isTop && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--primary)] rounded-r-full" />
      )}
      <div className="px-6 py-5 pl-8">
        {/* Name row */}
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold tabular-nums w-5 flex-shrink-0 ${isTop ? "text-[var(--primary)]" : "text-white/25"}`}>
            #{rank}
          </span>
          <span className="flex-1 min-w-0 text-[14px] font-semibold text-[var(--foreground)] leading-snug truncate">
            {c.nome}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] bg-white/[0.05] px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
            {fmtBrl(c.investimento)} investido
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
        </div>

        {/* Metrics row */}
        <div className="mt-4 ml-8 flex flex-wrap gap-x-7 gap-y-3">
          <MetricCell label="Impressões" value={fmt(c.impressoes)} />
          <MetricCell label="Cliques" value={fmt(c.cliques)} />
          {c.ctr !== null && <MetricCell label="CTR" value={fmtPct(c.ctr)} />}
          {hasLeads && <MetricCell label="Leads" value={fmt(c.leads)} />}
          {c.cpl !== null && <MetricCell label="CPL" value={fmtBrl(c.cpl)} />}
          {hasSales && <MetricCell label="Vendas" value={fmt(c.purchases)} highlight />}
          {hasSales && c.faturamento > 0 && <MetricCell label="Faturado" value={fmtBrl(c.faturamento)} highlight />}
          {c.roas !== null && <MetricCell label="ROAS" value={fmt(c.roas, 2) + "x"} />}
          {c.cpa !== null && <MetricCell label="Custo/Venda" value={fmtBrl(c.cpa)} />}
        </div>
      </div>
    </button>
  );
}

function ConjuntoRow({ c, rank, isLast, onClick }: { c: Conjunto; rank: number; isLast?: boolean; onClick: () => void }) {
  const isTop = rank === 1;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left group transition-all duration-150 hover:bg-[var(--primary)]/[0.04] relative ${!isLast ? "border-b border-white/[0.05]" : ""}`}
    >
      {isTop && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--primary)] rounded-r-full" />
      )}
      <div className="px-6 py-5 pl-8">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold tabular-nums w-5 flex-shrink-0 ${isTop ? "text-[var(--primary)]" : "text-white/25"}`}>
            #{rank}
          </span>
          <span className="flex-1 min-w-0 text-[14px] font-semibold text-[var(--foreground)] leading-snug truncate">
            {c.adsetName}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] bg-white/[0.05] px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
            {c.adCount} {c.adCount === 1 ? "anúncio" : "anúncios"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
        </div>
        <div className="mt-4 ml-8 flex flex-wrap gap-x-7 gap-y-3">
          <MetricCell label="Investido" value={fmtBrl(c.spend)} />
          <MetricCell label="Impressões" value={fmt(c.impressions)} />
          <MetricCell label="Cliques" value={fmt(c.clicks)} />
          {c.ctr !== null && <MetricCell label="CTR" value={fmtPct(c.ctr)} />}
          {c.cpc !== null && <MetricCell label="CPC" value={fmtBrl(c.cpc)} />}
        </div>
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden flex flex-col">
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
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {isVideo && (
            <span className="text-[10px] font-bold bg-black/80 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Play className="w-2.5 h-2.5" /> Vídeo
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isActive ? "bg-emerald-500/25 text-emerald-400" : "bg-white/10 text-[var(--muted-foreground)]"}`}>
            {isActive ? "Ativo" : (c.effectiveStatus ?? "—")}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">{c.adName}</p>
        {(c.title || c.body) && (
          <div className="text-xs text-[var(--muted-foreground)] space-y-1">
            {c.title && <p className="font-medium text-[var(--foreground)]/70 line-clamp-1">{c.title}</p>}
            {c.body && <p className="line-clamp-2 leading-relaxed">{c.body}</p>}
          </div>
        )}
        <div className="mt-auto pt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.06]">
          <MetricCell label="Investido" value={fmtBrl(c.spend)} />
          <MetricCell label="Impressões" value={fmt(c.impressions)} />
          <MetricCell label="Cliques" value={fmt(c.clicks)} />
          {c.ctr !== null && <MetricCell label="CTR" value={fmtPct(c.ctr)} />}
          {c.cpc !== null && <MetricCell label="CPC" value={fmtBrl(c.cpc)} />}
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
    if (selectedConjunto) setSelectedConjunto(null);
    else setSelectedCampanha(null);
  }

  const campanhas: Campanha[] = data?.campanhas ?? [];
  const conjuntos: Conjunto[] = data?.conjuntos ?? [];
  const criativos: Criativo[] = data?.criativos ?? [];

  const countLabel =
    nivel === "campanhas" && campanhas.length > 0
      ? `${campanhas.length} campanha${campanhas.length !== 1 ? "s" : ""}`
      : nivel === "conjuntos" && conjuntos.length > 0
      ? `${conjuntos.length} conjunto${conjuntos.length !== 1 ? "s" : ""}`
      : nivel === "criativos" && criativos.length > 0
      ? `${criativos.length} criativo${criativos.length !== 1 ? "s" : ""}`
      : null;

  const isRoot = nivel === "campanhas";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[var(--card)] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
        {!isRoot && (
          <button
            onClick={goBack}
            className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Title / Breadcrumb */}
        <div className="flex-1 min-w-0">
          {isRoot ? (
            /* Root: just the title */
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
              Campanhas
            </h3>
          ) : (
            /* Drill-down: breadcrumb + title */
            <>
              <nav className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mb-1 flex-wrap">
                <button
                  onClick={() => { setSelectedCampanha(null); setSelectedConjunto(null); }}
                  className="hover:text-[var(--foreground)] hover:underline transition-colors"
                >
                  Campanhas
                </button>
                {selectedCampanha && (
                  <>
                    <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
                    <button
                      onClick={() => setSelectedConjunto(null)}
                      className={`hover:text-[var(--foreground)] transition-colors truncate max-w-[220px] ${nivel === "conjuntos" ? "text-[var(--foreground)] font-semibold" : "hover:underline"}`}
                    >
                      {selectedCampanha}
                    </button>
                  </>
                )}
                {selectedConjunto && (
                  <>
                    <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
                    <span className="text-[var(--foreground)] font-semibold truncate max-w-[220px]">
                      {conjuntos.find(c => c.adsetId === selectedConjunto)?.adsetName ?? "Conjunto"}
                    </span>
                  </>
                )}
              </nav>
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                {nivel === "conjuntos" && <Target className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />}
                {nivel === "criativos" && <Eye className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />}
                {nivel === "conjuntos" && "Conjuntos de Anúncios"}
                {nivel === "criativos" && "Criativos"}
              </h3>
            </>
          )}
        </div>

        {countLabel && !isLoading && (
          <span className="text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 rounded-full flex-shrink-0">
            {countLabel}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-14 text-[var(--muted-foreground)] text-sm gap-2.5">
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          Carregando…
        </div>
      )}

      {isError && (
        <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">
          Erro ao carregar dados. Tente novamente.
        </div>
      )}

      {!isLoading && !isError && nivel === "campanhas" && (
        campanhas.length === 0 ? (
          <div className="text-center py-14 text-[var(--muted-foreground)] text-sm">
            <BarChart3 className="w-9 h-9 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhuma campanha encontrada no período.</p>
            <p className="text-xs mt-1.5 opacity-60">Os dados aparecem após o próximo sync.</p>
          </div>
        ) : (
          <div>
            {campanhas.map((c, i) => (
              <CampanhaRow
                key={c.nome}
                c={c}
                rank={i + 1}
                isLast={i === campanhas.length - 1}
                onClick={() => setSelectedCampanha(c.nome)}
              />
            ))}
          </div>
        )
      )}

      {!isLoading && !isError && nivel === "conjuntos" && (
        conjuntos.length === 0 ? (
          <div className="text-center py-14 text-[var(--muted-foreground)] text-sm">
            <Target className="w-9 h-9 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum conjunto encontrado para esta campanha.</p>
            <p className="text-xs mt-1.5 opacity-60">Os conjuntos aparecem após o próximo sync de criativos.</p>
          </div>
        ) : (
          <div>
            {conjuntos.map((c, i) => (
              <ConjuntoRow
                key={c.adsetId}
                c={c}
                rank={i + 1}
                isLast={i === conjuntos.length - 1}
                onClick={() => setSelectedConjunto(c.adsetId)}
              />
            ))}
          </div>
        )
      )}

      {!isLoading && !isError && nivel === "criativos" && (
        criativos.length === 0 ? (
          <div className="text-center py-14 text-[var(--muted-foreground)] text-sm">
            <Eye className="w-9 h-9 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum criativo encontrado para este conjunto.</p>
            <p className="text-xs mt-1.5 opacity-60">Os criativos aparecem após o próximo sync.</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {criativos.map((c) => (
              <CriativoCard key={c.adId} c={c} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
