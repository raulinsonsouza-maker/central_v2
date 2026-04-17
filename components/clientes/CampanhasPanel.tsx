"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ArrowLeft, BarChart3, Play, Target, Eye, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
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

const rowBg = (isTop: boolean) => isTop ? "bg-[var(--primary)]/[0.07]" : "bg-white/[0.03]";
const thClass = "px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]";

type SortCol = "nome" | "investimento" | "impressoes" | "cliques" | "ctr" | "leads" | "cpl" | "purchases" | "faturamento" | "roas";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return <ChevronsUpDown className="w-3 h-3 opacity-30 ml-1 inline-block" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 text-[var(--primary)] ml-1 inline-block" />
    : <ChevronDown className="w-3 h-3 text-[var(--primary)] ml-1 inline-block" />;
}

function SortTh({ col, label, align = "right", sortCol, sortDir, onSort }: {
  col: SortCol; label: string; align?: "left" | "right";
  sortCol: SortCol; sortDir: SortDir; onSort: (col: SortCol) => void;
}) {
  const active = col === sortCol;
  return (
    <th
      className={`px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.20em] cursor-pointer select-none whitespace-nowrap text-${align} transition-colors ${active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );
}

function sortCampanhas(arr: Campanha[], col: SortCol, dir: SortDir): Campanha[] {
  return [...arr].sort((a, b) => {
    let va: number | string, vb: number | string;
    if (col === "nome") { va = a.nome; vb = b.nome; }
    else if (col === "cpl") { va = a.cpl ?? Infinity; vb = b.cpl ?? Infinity; }
    else if (col === "roas") { va = a.roas ?? -Infinity; vb = b.roas ?? -Infinity; }
    else if (col === "ctr") { va = a.ctr ?? -Infinity; vb = b.ctr ?? -Infinity; }
    else { va = a[col] as number; vb = b[col] as number; }
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function CampanhasTable({ campanhas, onSelect }: { campanhas: Campanha[]; onSelect: (nome: string) => void }) {
  const [sortCol, setSortCol] = React.useState<SortCol>("investimento");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir(col === "nome" ? "asc" : "desc"); }
  }

  const sorted = sortCampanhas(campanhas, sortCol, sortDir);

  const hasLeads = campanhas.some(c => c.leads > 0);
  const hasSales = campanhas.some(c => c.purchases > 0 || c.faturamento > 0);

  const totals = {
    investimento: sum(campanhas.map(c => c.investimento)),
    impressoes: sum(campanhas.map(c => c.impressoes)),
    cliques: sum(campanhas.map(c => c.cliques)),
    leads: sum(campanhas.map(c => c.leads)),
    purchases: sum(campanhas.map(c => c.purchases)),
    faturamento: sum(campanhas.map(c => c.faturamento)),
  };
  const totalCtr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
  const totalCpl = totals.leads > 0 ? totals.investimento / totals.leads : null;
  const totalRoas = totals.investimento > 0 && totals.faturamento > 0 ? totals.faturamento / totals.investimento : null;

  const st = { sortCol, sortDir, onSort: handleSort };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate [border-spacing:0_6px]" style={{ minWidth: hasSales ? 960 : hasLeads ? 820 : 700 }}>
        <thead>
          <tr>
            <SortTh col="nome" label="Campanha" align="left" {...st} />
            <SortTh col="investimento" label="Investido" {...st} />
            <SortTh col="impressoes" label="Impressões" {...st} />
            <SortTh col="cliques" label="Cliques" {...st} />
            <SortTh col="ctr" label="CTR" {...st} />
            {hasLeads && <SortTh col="leads" label="Leads" {...st} />}
            {hasLeads && <SortTh col="cpl" label="CPL" {...st} />}
            {hasSales && <SortTh col="purchases" label="Vendas" {...st} />}
            {hasSales && <SortTh col="faturamento" label="Faturado" {...st} />}
            {hasSales && <SortTh col="roas" label="ROAS" {...st} />}
            <th className="w-8" />
          </tr>
        </thead>

        <tbody>
          {sorted.map((c, i) => {
            const isTop = i === 0;
            const bg = rowBg(isTop);
            return (
              <tr
                key={c.nome}
                className="group cursor-pointer"
                onClick={() => onSelect(c.nome)}
              >
                {/* Campanha name */}
                <td className={`rounded-l-2xl px-4 py-4 ${bg}`}>
                  <div className="flex items-center gap-2.5">
                    {isTop && (
                      <span className="shrink-0 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--primary)]">
                        #1
                      </span>
                    )}
                    {!isTop && (
                      <span className="text-[11px] font-bold text-white/20 tabular-nums shrink-0 w-5 text-right">
                        #{i + 1}
                      </span>
                    )}
                    <p className="text-[12px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2 max-w-[360px]">
                      {c.nome}
                    </p>
                  </div>
                </td>

                {/* Investido */}
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                  {fmtBrl(c.investimento)}
                </td>

                {/* Impressões */}
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                  {fmt(c.impressoes)}
                </td>

                {/* Cliques */}
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                  {fmt(c.cliques)}
                </td>

                {/* CTR */}
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                  {c.ctr !== null ? fmtPct(c.ctr) : "—"}
                </td>

                {/* Leads */}
                {hasLeads && (
                  <td className={`px-4 py-4 text-right tabular-nums ${bg}`}>
                    <span className={`text-[14px] font-bold ${isTop && c.leads > 0 ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                      {fmt(c.leads)}
                    </span>
                  </td>
                )}

                {/* CPL */}
                {hasLeads && (
                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                    {c.cpl !== null ? fmtBrl(c.cpl) : "—"}
                  </td>
                )}

                {/* Vendas */}
                {hasSales && (
                  <td className={`px-4 py-4 text-right tabular-nums ${bg}`}>
                    <span className={`text-[15px] font-black ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                      {fmt(c.purchases)}
                    </span>
                  </td>
                )}

                {/* Faturado */}
                {hasSales && (
                  <td className={`px-4 py-4 text-right tabular-nums ${bg}`}>
                    <span className={`text-[13px] font-bold ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                      {c.faturamento > 0 ? fmtBrl(c.faturamento) : "—"}
                    </span>
                  </td>
                )}

                {/* ROAS */}
                {hasSales && (
                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                    {c.roas !== null ? fmt(c.roas, 2) + "x" : "—"}
                  </td>
                )}

                {/* Chevron */}
                <td className={`rounded-r-2xl px-3 py-4 ${bg}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors ml-auto" />
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Totals row */}
        <tfoot>
          <tr>
            <td className="rounded-l-2xl bg-white/[0.06] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">Total</p>
            </td>
            <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
              {fmtBrl(totals.investimento)}
            </td>
            <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
              {fmt(totals.impressoes)}
            </td>
            <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
              {fmt(totals.cliques)}
            </td>
            <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
              {fmtPct(totalCtr)}
            </td>
            {hasLeads && (
              <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[15px] font-black text-[var(--primary)]">
                {fmt(totals.leads)}
              </td>
            )}
            {hasLeads && (
              <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
                {totalCpl !== null ? fmtBrl(totalCpl) : "—"}
              </td>
            )}
            {hasSales && (
              <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[15px] font-black text-[var(--primary)]">
                {fmt(totals.purchases)}
              </td>
            )}
            {hasSales && (
              <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-bold text-[var(--primary)]">
                {totals.faturamento > 0 ? fmtBrl(totals.faturamento) : "—"}
              </td>
            )}
            {hasSales && (
              <td className="bg-white/[0.06] px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)]">
                {totalRoas !== null ? fmt(totalRoas, 2) + "x" : "—"}
              </td>
            )}
            <td className="rounded-r-2xl bg-white/[0.06] px-3 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ConjuntosTable({ conjuntos, onSelect }: { conjuntos: Conjunto[]; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-separate [border-spacing:0_6px]">
        <thead>
          <tr>
            <th className={`${thClass} text-left min-w-[280px]`}>Conjunto de Anúncios</th>
            <th className={`${thClass} text-right`}>Investido</th>
            <th className={`${thClass} text-right`}>Impressões</th>
            <th className={`${thClass} text-right`}>Cliques</th>
            <th className={`${thClass} text-right`}>CTR</th>
            <th className={`${thClass} text-right`}>CPC</th>
            <th className={`${thClass} text-right`}>Anúncios</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {conjuntos.map((c, i) => {
            const isTop = i === 0;
            const bg = rowBg(isTop);
            return (
              <tr key={c.adsetId} className="group cursor-pointer" onClick={() => onSelect(c.adsetId)}>
                <td className={`rounded-l-2xl px-4 py-4 ${bg}`}>
                  <div className="flex items-center gap-2.5">
                    {isTop ? (
                      <span className="shrink-0 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--primary)]">#1</span>
                    ) : (
                      <span className="text-[11px] font-bold text-white/20 tabular-nums shrink-0 w-5 text-right">#{i + 1}</span>
                    )}
                    <p className="text-[12px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2 max-w-[360px]">{c.adsetName}</p>
                  </div>
                </td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{fmtBrl(c.spend)}</td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{fmt(c.impressions)}</td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{fmt(c.clicks)}</td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{c.ctr !== null ? fmtPct(c.ctr) : "—"}</td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{c.cpc !== null ? fmtBrl(c.cpc) : "—"}</td>
                <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>{c.adCount}</td>
                <td className={`rounded-r-2xl px-3 py-4 ${bg}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors ml-auto" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
          <video src={c.videoSourceUrl} poster={thumbUpgraded ?? undefined} controls className="w-full h-full object-cover" onError={() => setVideoError(true)} />
        ) : thumbUpgraded ? (
          <img src={thumbUpgraded} alt={c.adName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
        <div className="mt-auto pt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/[0.06]">
          {[
            { label: "Investido", value: fmtBrl(c.spend) },
            { label: "Impressões", value: fmt(c.impressions) },
            { label: "Cliques", value: fmt(c.clicks) },
            ...(c.ctr !== null ? [{ label: "CTR", value: fmtPct(c.ctr) }] : []),
            ...(c.cpc !== null ? [{ label: "CPC", value: fmtBrl(c.cpc) }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
              <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">{value}</span>
            </div>
          ))}
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
  const isRoot = nivel === "campanhas";

  const countLabel =
    nivel === "campanhas" && campanhas.length > 0
      ? `${campanhas.length} campanha${campanhas.length !== 1 ? "s" : ""}`
      : nivel === "conjuntos" && conjuntos.length > 0
      ? `${conjuntos.length} conjunto${conjuntos.length !== 1 ? "s" : ""}`
      : nivel === "criativos" && criativos.length > 0
      ? `${criativos.length} criativo${criativos.length !== 1 ? "s" : ""}`
      : null;

  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-5 sm:px-8 border-b border-white/[0.05] flex items-center gap-4">
        {!isRoot && (
          <button onClick={goBack} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {!isRoot && (
            <nav className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mb-1 flex-wrap">
              <button onClick={() => { setSelectedCampanha(null); setSelectedConjunto(null); }} className="hover:text-[var(--foreground)] hover:underline transition-colors">
                Campanhas
              </button>
              {selectedCampanha && (
                <>
                  <ChevronRight className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
                  <button onClick={() => setSelectedConjunto(null)} className={`truncate max-w-[220px] hover:text-[var(--foreground)] transition-colors ${nivel === "conjuntos" ? "text-[var(--foreground)] font-semibold" : "hover:underline"}`}>
                    {selectedCampanha}
                  </button>
                </>
              )}
              {selectedConjunto && (
                <>
                  <ChevronRight className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
                  <span className="text-[var(--foreground)] font-semibold truncate max-w-[220px]">
                    {conjuntos.find(c => c.adsetId === selectedConjunto)?.adsetName ?? "Conjunto"}
                  </span>
                </>
              )}
            </nav>
          )}

          <h3 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-2xl flex items-center gap-2.5">
            {isRoot && <BarChart3 className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
            {nivel === "conjuntos" && <Target className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
            {nivel === "criativos" && <Eye className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
            {isRoot ? (
              <>Campanhas</>
            ) : nivel === "conjuntos" ? (
              <>Conjuntos de <span className="bg-[linear-gradient(90deg,var(--accent),var(--primary))] bg-clip-text text-transparent">Anúncios</span></>
            ) : (
              <>Criativos</>
            )}
          </h3>
          {isRoot && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Clique em uma campanha para ver conjuntos e criativos.
            </p>
          )}
        </div>

        {countLabel && !isLoading && (
          <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--foreground)] flex-shrink-0">
            {countLabel}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[var(--muted-foreground)] text-sm gap-2.5">
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
          <div className="text-center py-16 text-[var(--muted-foreground)] text-sm">
            <BarChart3 className="w-9 h-9 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhuma campanha encontrada no período.</p>
            <p className="text-xs mt-1.5 opacity-60">Os dados aparecem após o próximo sync.</p>
          </div>
        ) : (
          <div className="px-3 pb-5 pt-4 sm:px-5 sm:pb-6">
            <CampanhasTable campanhas={campanhas} onSelect={setSelectedCampanha} />
          </div>
        )
      )}

      {!isLoading && !isError && nivel === "conjuntos" && (
        conjuntos.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted-foreground)] text-sm">
            <Target className="w-9 h-9 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum conjunto encontrado para esta campanha.</p>
            <p className="text-xs mt-1.5 opacity-60">Os conjuntos aparecem após o próximo sync de criativos.</p>
          </div>
        ) : (
          <div className="px-3 pb-5 pt-4 sm:px-5 sm:pb-6">
            <ConjuntosTable conjuntos={conjuntos} onSelect={setSelectedConjunto} />
          </div>
        )
      )}

      {!isLoading && !isError && nivel === "criativos" && (
        criativos.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted-foreground)] text-sm">
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
