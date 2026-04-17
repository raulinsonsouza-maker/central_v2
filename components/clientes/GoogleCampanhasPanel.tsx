"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, BarChart3, Search, Globe } from "lucide-react";

type DateFilter = { periodo: string; dataInicio?: string; dataFim?: string };

function buildParams(filter: DateFilter, extra: Record<string, string>) {
  const p = new URLSearchParams();
  p.set("periodo", filter.periodo);
  if (filter.dataInicio) p.set("dataInicio", filter.dataInicio);
  if (filter.dataFim) p.set("dataFim", filter.dataFim);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

function fmt(v: number, d = 0) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtBrl(v: number) { return "R$\u00a0" + fmt(v, 2); }
function fmtPct(v: number) { return fmt(v, 2) + "%"; }

// ── types ──────────────────────────────────────────────────────────────────────
interface Campanha {
  nome: string; campaignId: string | null;
  investimento: number; impressoes: number; cliques: number; conversoes: number;
  grupoCount: number; adCount: number;
  ctr: number | null; cpc: number | null; custoConversao: number | null;
}
interface Grupo {
  nome: string; adGroupId: string | null;
  investimento: number; impressoes: number; cliques: number; conversoes: number;
  adCount: number;
  ctr: number | null; cpc: number | null; custoConversao: number | null;
}
interface Anuncio {
  adResourceName: string;
  headline1: string | null; headline2: string | null; description: string | null; finalUrls: string | null;
  investimento: number; impressoes: number; cliques: number; conversoes: number;
  ctr: number | null; cpc: number | null; cpm: number | null; custoConversao: number | null;
}

// ── sort ───────────────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc";
function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === "desc" ? <ChevronDown className="w-3 h-3 text-[var(--primary)]" /> : <ChevronUp className="w-3 h-3 text-[var(--primary)]" />;
}
function useSortable<T>(data: T[], defaultKey: keyof T) {
  const [key, setKey] = React.useState<keyof T>(defaultKey);
  const [dir, setDir] = React.useState<SortDir>("desc");
  const sorted = React.useMemo(() => [...data].sort((a, b) => {
    const av = a[key] as number | null ?? (dir === "desc" ? -Infinity : Infinity);
    const bv = b[key] as number | null ?? (dir === "desc" ? -Infinity : Infinity);
    return dir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
  }), [data, key, dir]);
  function toggle(k: keyof T) {
    if (k === key) setDir(d => d === "desc" ? "asc" : "desc");
    else { setKey(k); setDir("desc"); }
  }
  return { sorted, key: key as string, dir, toggle };
}

// ── header cell ────────────────────────────────────────────────────────────────
function Th({ label, col, sortKey, dir, onSort, right = true }: {
  label: string; col: string; sortKey: string; dir: SortDir; onSort: (k: string) => void; right?: boolean;
}) {
  return (
    <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] cursor-pointer select-none hover:text-[var(--foreground)] transition-colors ${right ? "text-right" : "text-left"}`}
      onClick={() => onSort(col)}>
      <span className={`inline-flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {label}<SortIcon col={col} sortKey={sortKey} dir={dir} />
      </span>
    </th>
  );
}

// ── cell helpers ───────────────────────────────────────────────────────────────
const Td = ({ v, muted = false, highlight = false }: { v: string; muted?: boolean; highlight?: boolean }) => (
  <td className={`px-3 py-3 text-right text-sm font-semibold tabular-nums ${muted ? "text-[var(--muted-foreground)]" : highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{v}</td>
);
const dash = "—";
const n = (v: number | null, fn: (x: number) => string) => v != null && v > 0 ? fn(v) : dash;

// ── empty state ────────────────────────────────────────────────────────────────
function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <BarChart3 className="w-8 h-8 text-[var(--muted-foreground)] opacity-30" />
      <p className="text-sm text-[var(--muted-foreground)]">{msg}</p>
      <p className="text-xs text-[var(--muted-foreground)] opacity-70">Os dados aparecem após o próximo sync de criativos.</p>
    </div>
  );
}

// ─── Campaign type badge ────────────────────────────────────────────────────────
function campTypeBadge(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("brand") || n.includes("marca")) return { label: "Brand", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  if (n.includes("rmkt") || n.includes("remarketing") || n.includes("retargeting")) return { label: "Rmkt", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  if (n.includes("performance") || n.includes("pmax") || n.includes("p.max")) return { label: "PMax", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (n.includes("search") || n.includes("pesquisa") || n.includes("rede de pesquisa")) return { label: "Search", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" };
  if (n.includes("display") || n.includes("rede de display")) return { label: "Display", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
  if (n.includes("video") || n.includes("youtube")) return { label: "Video", color: "bg-red-500/10 text-red-400 border-red-500/20" };
  if (n.includes("shopping") || n.includes("google shopping")) return { label: "Shopping", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
  return { label: "Google", color: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20" };
}

// ─── LEVEL 1: Campanhas table ──────────────────────────────────────────────────
function CampanhasTable({ campanhas, onSelect }: { campanhas: Campanha[]; onSelect: (c: Campanha) => void }) {
  const { sorted, key, dir, toggle } = useSortable(campanhas, "investimento");
  const hasConv = campanhas.some(c => c.conversoes > 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full min-w-[640px]">
        <thead className="bg-white/[0.02]">
          <tr>
            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Campanha</th>
            <Th label="Investido" col="investimento" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="Impressões" col="impressoes" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="Cliques" col="cliques" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="CTR" col="ctr" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="CPC" col="cpc" sortKey={key} dir={dir} onSort={toggle} />
            {hasConv && <>
              <Th label="Conversões" col="conversoes" sortKey={key} dir={dir} onSort={toggle} />
              <Th label="Custo/Conv" col="custoConversao" sortKey={key} dir={dir} onSort={toggle} />
            </>}
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const isTop = i === 0;
            const badge = campTypeBadge(c.nome);
            return (
              <tr key={c.nome}
                className={`border-t border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--primary)]/[0.04] ${isTop ? "bg-[var(--primary)]/[0.05]" : "bg-white/[0.02]"}`}
                onClick={() => onSelect(c)}>
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    {isTop && <span className="shrink-0 mt-0.5 rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--primary)]">#1</span>}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate max-w-xs" title={c.nome}>{c.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">{c.grupoCount} grupos · {c.adCount} anúncios</span>
                      </div>
                    </div>
                  </div>
                </td>
                <Td v={fmtBrl(c.investimento)} highlight />
                <Td v={fmt(c.impressoes)} muted />
                <Td v={fmt(c.cliques)} />
                <Td v={n(c.ctr, fmtPct)} muted />
                <Td v={n(c.cpc, fmtBrl)} />
                {hasConv && <>
                  <Td v={fmt(c.conversoes)} />
                  <Td v={n(c.custoConversao, fmtBrl)} />
                </>}
                <td className="px-3 py-3 text-[var(--muted-foreground)]">
                  <ChevronRight className="w-4 h-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── LEVEL 2: Grupos table ─────────────────────────────────────────────────────
function GruposTable({ grupos, onSelect }: { grupos: Grupo[]; onSelect: (g: Grupo) => void }) {
  const { sorted, key, dir, toggle } = useSortable(grupos, "investimento");
  const hasConv = grupos.some(g => g.conversoes > 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full min-w-[600px]">
        <thead className="bg-white/[0.02]">
          <tr>
            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Grupo de anúncios</th>
            <Th label="Investido" col="investimento" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="Impressões" col="impressoes" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="Cliques" col="cliques" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="CTR" col="ctr" sortKey={key} dir={dir} onSort={toggle} />
            <Th label="CPC" col="cpc" sortKey={key} dir={dir} onSort={toggle} />
            {hasConv && <>
              <Th label="Conversões" col="conversoes" sortKey={key} dir={dir} onSort={toggle} />
              <Th label="Custo/Conv" col="custoConversao" sortKey={key} dir={dir} onSort={toggle} />
            </>}
            <Th label="Anúncios" col="adCount" sortKey={key} dir={dir} onSort={toggle} />
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((g, i) => (
            <tr key={g.nome}
              className={`border-t border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--primary)]/[0.04] ${i === 0 ? "bg-[var(--primary)]/[0.05]" : "bg-white/[0.02]"}`}
              onClick={() => onSelect(g)}>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--primary)]">#1</span>}
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate max-w-xs" title={g.nome}>{g.nome}</p>
                </div>
              </td>
              <Td v={fmtBrl(g.investimento)} highlight />
              <Td v={fmt(g.impressoes)} muted />
              <Td v={fmt(g.cliques)} />
              <Td v={n(g.ctr, fmtPct)} muted />
              <Td v={n(g.cpc, fmtBrl)} />
              {hasConv && <>
                <Td v={fmt(g.conversoes)} />
                <Td v={n(g.custoConversao, fmtBrl)} />
              </>}
              <Td v={fmt(g.adCount)} muted />
              <td className="px-3 py-3 text-[var(--muted-foreground)]"><ChevronRight className="w-4 h-4" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── LEVEL 3: Anúncios table ───────────────────────────────────────────────────
function AnunciosTable({ anuncios }: { anuncios: Anuncio[] }) {
  const { sorted, key, dir, toggle } = useSortable(anuncios, "investimento");
  const hasConv = anuncios.some(a => a.conversoes > 0);

  if (!anuncios.length) return <Empty msg="Nenhum anúncio encontrado para este grupo." />;

  return (
    <div className="space-y-3">
      {sorted.map((a) => (
        <div key={a.adResourceName} className="rounded-2xl border border-[var(--border)] bg-white/[0.02] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-white/[0.01]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--foreground)] leading-snug">
                  {[a.headline1, a.headline2].filter(Boolean).join(" | ") || "Anúncio sem título"}
                </p>
                {a.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">{a.description}</p>
                )}
                {a.finalUrls && (
                  <p className="text-[10px] text-emerald-500 mt-1.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {(() => { try { return new URL(a.finalUrls).hostname; } catch { return a.finalUrls.slice(0, 40); } })()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-[var(--border)]">
            {[
              { label: "Investido", v: fmtBrl(a.investimento), accent: true },
              { label: "Impressões", v: fmt(a.impressoes) },
              { label: "Cliques", v: fmt(a.cliques) },
              { label: "CTR", v: n(a.ctr, fmtPct) },
              { label: "CPC", v: n(a.cpc, fmtBrl) },
              ...(hasConv ? [
                { label: "Conversões", v: fmt(a.conversoes) },
                { label: "Custo/Conv", v: n(a.custoConversao, fmtBrl) },
              ] : []),
            ].map(({ label, v, accent }) => (
              <div key={label} className="p-3 text-center">
                <p className={`text-sm font-bold ${accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{v}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
interface Props { clienteId: string; filter: DateFilter; }

type View =
  | { nivel: "campanhas" }
  | { nivel: "grupos"; campanha: Campanha }
  | { nivel: "anuncios"; campanha: Campanha; grupo: Grupo };

export function GoogleCampanhasPanel({ clienteId, filter }: Props) {
  const [view, setView] = React.useState<View>({ nivel: "campanhas" });

  // fetch campanhas
  const campParams = buildParams(filter, { nivel: "campanhas" });
  const { data: campData, isLoading: campLoading } = useQuery<{ campanhas: Campanha[] }>({
    queryKey: ["google-campanhas", clienteId, campParams],
    queryFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/campanhas-google?${campParams}`);
      if (!r.ok) throw new Error("Falha ao carregar campanhas Google");
      return r.json();
    },
    enabled: view.nivel === "campanhas",
    staleTime: 1000 * 60 * 2,
  });

  // fetch grupos
  const grupoParams = view.nivel !== "campanhas"
    ? buildParams(filter, { nivel: "grupos", campanha: view.campanha.nome })
    : null;
  const { data: grupoData, isLoading: grupoLoading } = useQuery<{ grupos: Grupo[] }>({
    queryKey: ["google-grupos", clienteId, grupoParams],
    queryFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/campanhas-google?${grupoParams!}`);
      if (!r.ok) throw new Error("Falha ao carregar grupos Google");
      return r.json();
    },
    enabled: view.nivel === "grupos" && grupoParams !== null,
    staleTime: 1000 * 60 * 2,
  });

  // fetch anuncios
  const anuncioParams = view.nivel === "anuncios"
    ? buildParams(filter, { nivel: "anuncios", campanha: view.campanha.nome, grupo: view.grupo.nome })
    : null;
  const { data: anuncioData, isLoading: anuncioLoading } = useQuery<{ anuncios: Anuncio[] }>({
    queryKey: ["google-anuncios", clienteId, anuncioParams],
    queryFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/campanhas-google?${anuncioParams!}`);
      if (!r.ok) throw new Error("Falha ao carregar anúncios Google");
      return r.json();
    },
    enabled: view.nivel === "anuncios" && anuncioParams !== null,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = view.nivel === "campanhas" ? campLoading
    : view.nivel === "grupos" ? grupoLoading
    : anuncioLoading;

  // ── breadcrumb title ────────────────────────────────────────────────────────
  const titleMap: Record<string, string> = { campanhas: "Campanhas", grupos: "Grupos de Anúncios", anuncios: "Anúncios" };
  const title = titleMap[view.nivel];

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3">
        {view.nivel !== "campanhas" && (
          <button
            onClick={() => {
              if (view.nivel === "anuncios") setView({ nivel: "grupos", campanha: view.campanha });
              else setView({ nivel: "campanhas" });
            }}
            className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}

        {/* breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          <button
            onClick={() => setView({ nivel: "campanhas" })}
            className={`font-semibold transition-colors ${view.nivel === "campanhas" ? "text-[var(--foreground)]" : "text-[var(--primary)] hover:underline"}`}
          >
            Campanhas
          </button>
          {view.nivel !== "campanhas" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <button
                onClick={() => view.nivel === "anuncios" && setView({ nivel: "grupos", campanha: view.campanha })}
                className={`font-semibold truncate max-w-[180px] transition-colors ${view.nivel === "grupos" ? "text-[var(--foreground)]" : "text-[var(--primary)] hover:underline"}`}
                title={view.campanha.nome}
              >
                {view.campanha.nome}
              </button>
            </>
          )}
          {view.nivel === "anuncios" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span className="font-semibold text-[var(--foreground)] truncate max-w-[180px]" title={view.grupo.nome}>
                {view.grupo.nome}
              </span>
            </>
          )}
        </div>
      </div>

      {/* panel title */}
      <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">Google Ads</p>
          <p className="text-sm font-extrabold text-[var(--foreground)] uppercase tracking-wider">{title}</p>
        </div>
      </div>

      {/* content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--muted-foreground)]">Carregando {title.toLowerCase()}…</p>
        </div>
      ) : view.nivel === "campanhas" ? (
        campData?.campanhas?.length ? (
          <CampanhasTable
            campanhas={campData.campanhas}
            onSelect={(c) => setView({ nivel: "grupos", campanha: c })}
          />
        ) : (
          <Empty msg="Nenhuma campanha Google encontrada para este período." />
        )
      ) : view.nivel === "grupos" ? (
        grupoData?.grupos?.length ? (
          <GruposTable
            grupos={grupoData.grupos}
            onSelect={(g) => setView({ nivel: "anuncios", campanha: (view as { campanha: Campanha }).campanha, grupo: g })}
          />
        ) : (
          <Empty msg="Nenhum grupo encontrado para esta campanha." />
        )
      ) : (
        <AnunciosTable anuncios={anuncioData?.anuncios ?? []} />
      )}
    </div>
  );
}
