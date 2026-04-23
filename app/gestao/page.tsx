"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

function fmt(v: number, d = 0) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtBrl(v: number) {
  return "R$\u00a0" + fmt(v, 2);
}
function fmtPct(v: number) {
  return fmt(v, 1) + "%";
}

type PaceStatus = "critico_baixo" | "baixo" | "ok" | "alto" | "sem_dado";

function getPaceStatus(pct: number | null): PaceStatus {
  if (pct === null) return "sem_dado";
  if (pct < 70) return "critico_baixo";
  if (pct < 90) return "baixo";
  if (pct <= 115) return "ok";
  return "alto";
}

const PACE_COLORS: Record<PaceStatus, string> = {
  critico_baixo: "text-red-400 bg-red-500/15",
  baixo: "text-amber-400 bg-amber-500/15",
  ok: "text-emerald-400 bg-emerald-500/15",
  alto: "text-orange-400 bg-orange-500/15",
  sem_dado: "text-white/30 bg-white/[0.05]",
};

const PACE_LABEL: Record<PaceStatus, string> = {
  critico_baixo: "Muito abaixo",
  baixo: "Abaixo",
  ok: "No ritmo",
  alto: "Acima",
  sem_dado: "Sem orçamento",
};

function PaceBadge({ pct }: { pct: number | null }) {
  const status = getPaceStatus(pct);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${PACE_COLORS[status]}`}
    >
      {pct !== null ? fmtPct(pct) : "—"}
    </span>
  );
}

function SaldoBadge({ dias }: { dias: number | null }) {
  if (dias === null)
    return (
      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/30">
        —
      </span>
    );
  if (dias < 3)
    return (
      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
        {fmt(dias, 1)} dias
      </span>
    );
  if (dias < 7)
    return (
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
        {fmt(dias, 1)} dias
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
      {fmt(dias, 1)} dias
    </span>
  );
}

type SortDir = "asc" | "desc";
type PaceSortCol =
  | "nome"
  | "budgetMeta"
  | "spendMeta"
  | "paceMeta"
  | "budgetGoogle"
  | "spendGoogle"
  | "paceGoogle"
  | "paceTotal";

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="inline-block ml-1 h-3 w-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="inline-block ml-1 h-3 w-3 text-[var(--primary)]" />
  ) : (
    <ChevronDown className="inline-block ml-1 h-3 w-3 text-[var(--primary)]" />
  );
}

function SortTh({
  col,
  label,
  sortCol,
  sortDir,
  onSort,
  align = "right",
}: {
  col: string;
  label: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (c: string) => void;
  align?: "left" | "right";
}) {
  const active = col === sortCol;
  return (
    <th
      onClick={() => onSort(col)}
      className={`cursor-pointer select-none whitespace-nowrap px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-${align} transition-colors ${
        active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
      <SortIcon col={col} active={active} dir={sortDir} />
    </th>
  );
}

interface PaceCliente {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  segmento: string | null;
  budgetMeta: number | null;
  budgetGoogle: number | null;
  spendMeta: number;
  spendGoogle: number;
  paceMeta: number | null;
  paceGoogle: number | null;
  paceTotal: number | null;
}

function PaceTable({ clientes, expectedPacePct }: { clientes: PaceCliente[]; expectedPacePct: number }) {
  const [sortCol, setSortCol] = useState<PaceSortCol>("paceTotal");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [soloAtencao, setSoloAtencao] = useState(false);

  function handleSort(col: string) {
    const c = col as PaceSortCol;
    if (c === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(c); setSortDir(c === "nome" ? "asc" : "asc"); }
  }

  const st = { sortCol, sortDir, onSort: handleSort };

  const filtered = soloAtencao
    ? clientes.filter((c) => {
        const s = getPaceStatus(c.paceTotal ?? c.paceMeta ?? c.paceGoogle);
        return s === "critico_baixo" || s === "baixo" || s === "alto";
      })
    : clientes;

  const sorted = [...filtered].sort((a, b) => {
    let va: number, vb: number;
    if (sortCol === "nome") {
      return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
    }
    va = (a[sortCol] as number | null) ?? (sortDir === "asc" ? Infinity : -Infinity);
    vb = (b[sortCol] as number | null) ?? (sortDir === "asc" ? Infinity : -Infinity);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            Pace dos Projetos
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            Ritmo esperado do mês: <span className="font-semibold text-[var(--foreground)]">{fmtPct(expectedPacePct)}</span>
          </p>
        </div>
        <button
          onClick={() => setSoloAtencao((v) => !v)}
          className={`rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
            soloAtencao
              ? "bg-amber-500/20 text-amber-400"
              : "border border-white/[0.08] text-white/40 hover:border-amber-500/30 hover:text-amber-400"
          }`}
        >
          {soloAtencao ? "Mostrando atenção" : "Filtrar atenção"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate [border-spacing:0_4px]" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <SortTh col="nome" label="Cliente" align="left" {...st} />
              <SortTh col="budgetMeta" label="Budget Meta" {...st} />
              <SortTh col="spendMeta" label="Investido Meta" {...st} />
              <SortTh col="paceMeta" label="Pace Meta" {...st} />
              <SortTh col="budgetGoogle" label="Budget Google" {...st} />
              <SortTh col="spendGoogle" label="Investido Google" {...st} />
              <SortTh col="paceGoogle" label="Pace Google" {...st} />
              <SortTh col="paceTotal" label="Pace Total" {...st} />
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const statusTotal = getPaceStatus(c.paceTotal ?? c.paceMeta ?? c.paceGoogle);
              const isCritico = statusTotal === "critico_baixo";
              const isAlto = statusTotal === "alto";
              const rowBg = isCritico
                ? "bg-red-500/[0.05]"
                : isAlto
                ? "bg-[var(--primary)]/[0.04]"
                : "bg-white/[0.025]";

              return (
                <tr key={c.id} className="group">
                  <td className={`rounded-l-xl px-3 py-3 ${rowBg}`}>
                    <div className="flex items-center gap-2.5">
                      {c.logoUrl ? (
                        <Image
                          src={c.logoUrl}
                          alt={c.nome}
                          width={24}
                          height={24}
                          className="h-6 w-6 rounded-md object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)]/20">
                          <span className="text-[9px] font-bold text-[var(--primary)]">
                            {c.nome.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-[12px] font-semibold text-[var(--foreground)]">{c.nome}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-right text-[12px] tabular-nums text-[var(--muted-foreground)] ${rowBg}`}>
                    {c.budgetMeta != null ? fmtBrl(c.budgetMeta) : <span className="text-white/20">—</span>}
                  </td>
                  <td className={`px-3 py-3 text-right text-[12px] tabular-nums text-[var(--foreground)] ${rowBg}`}>
                    {c.budgetMeta != null ? fmtBrl(c.spendMeta) : <span className="text-white/20">—</span>}
                  </td>
                  <td className={`px-3 py-3 text-right ${rowBg}`}>
                    {c.budgetMeta != null ? (
                      <PaceBadge pct={c.paceMeta} />
                    ) : (
                      <span className="text-[11px] text-white/20">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-right text-[12px] tabular-nums text-[var(--muted-foreground)] ${rowBg}`}>
                    {c.budgetGoogle != null ? fmtBrl(c.budgetGoogle) : <span className="text-white/20">—</span>}
                  </td>
                  <td className={`px-3 py-3 text-right text-[12px] tabular-nums text-[var(--foreground)] ${rowBg}`}>
                    {c.budgetGoogle != null ? fmtBrl(c.spendGoogle) : <span className="text-white/20">—</span>}
                  </td>
                  <td className={`px-3 py-3 text-right ${rowBg}`}>
                    {c.budgetGoogle != null ? (
                      <PaceBadge pct={c.paceGoogle} />
                    ) : (
                      <span className="text-[11px] text-white/20">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-right ${rowBg}`}>
                    <PaceBadge pct={c.paceTotal} />
                  </td>
                  <td className={`rounded-r-xl px-2 py-3 ${rowBg}`}>
                    <Link
                      href={`/clientes/${c.id}`}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="py-8 text-center text-[12px] text-[var(--muted-foreground)]">
            Nenhum cliente com orçamento configurado encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

interface SaldoConta {
  clienteId: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  accountId: string | null;
  saldo: number | null;
  moeda: string;
  burnDiario7d: number;
  diasRestantes: number | null;
  erro: string | null;
}

function SaldosPanel({ contas }: { contas: SaldoConta[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
      <div className="mb-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
          Saldo das Contas Meta
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          Contas pré-pagas — ordenadas pelo menor saldo restante primeiro.
        </p>
      </div>
      <div className="space-y-2">
        {contas.map((c) => {
          const dias = c.diasRestantes;
          const isCritico = dias !== null && dias < 3;
          const isAviso = dias !== null && dias >= 3 && dias < 7;
          const borderClass = isCritico
            ? "border-red-500/40"
            : isAviso
            ? "border-amber-500/30"
            : "border-white/[0.06]";

          return (
            <div
              key={c.clienteId}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${borderClass} ${
                isCritico ? "bg-red-500/[0.04]" : isAviso ? "bg-amber-500/[0.03]" : "bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {c.logoUrl ? (
                  <Image
                    src={c.logoUrl}
                    alt={c.nome}
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-lg object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/20">
                    <span className="text-[9px] font-bold text-[var(--primary)]">
                      {c.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--foreground)] truncate">{c.nome}</p>
                  {c.erro ? (
                    <p className="text-[10px] text-white/30">Sem dados disponíveis</p>
                  ) : (
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      Burn médio: {fmtBrl(c.burnDiario7d)}/dia
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {c.erro && (
                  <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/30">
                    sem dados
                  </span>
                )}
                {!c.erro && c.saldo !== null && (
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[var(--foreground)]">
                      {fmtBrl(c.saldo)}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">disponível</p>
                  </div>
                )}
                {!c.erro && <SaldoBadge dias={c.diasRestantes} />}
                <Link
                  href={`/clientes/${c.clienteId}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
        {contas.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[var(--muted-foreground)]">
            Nenhuma conta Meta configurada.
          </p>
        )}
      </div>
    </div>
  );
}

interface Anomalia {
  clienteId: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  canal: string;
  ultimoGastoData: string;
  diasSemGasto: number;
}

function AnomaliasPanel({
  anomalias,
  semOrcamento,
}: {
  anomalias: Anomalia[];
  semOrcamento: Array<{ id: string; nome: string; slug: string; logoUrl: string | null }>;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            Anomalias de Gasto
          </h2>
          {anomalias.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              {anomalias.length}
            </span>
          )}
        </div>
        <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
          Clientes com gasto nos dias 3–9 atrás mas R$ 0 nos últimos 2 dias — provável pausa acidental.
        </p>
        <div className="space-y-2">
          {anomalias.map((a) => (
            <div
              key={`${a.clienteId}-${a.canal}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                {a.logoUrl ? (
                  <Image src={a.logoUrl} alt={a.nome} width={22} height={22} className="h-5 w-5 rounded-md object-contain shrink-0" unoptimized />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded-md bg-[var(--primary)]/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[var(--primary)]">{a.nome.slice(0,2).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--foreground)] truncate">{a.nome}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {a.canal} · último gasto {a.ultimoGastoData.split("-").reverse().join("/")} · {a.diasSemGasto}d sem gastar
                  </p>
                </div>
              </div>
              <Link
                href={`/clientes/${a.clienteId}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-amber-400/50 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
          {anomalias.length === 0 && (
            <p className="py-3 text-center text-[11px] text-emerald-400">
              ✓ Nenhuma anomalia detectada
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-white/30" />
          <h2 className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
            Sem Orçamento Configurado
          </h2>
          {semOrcamento.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-white/40">
              {semOrcamento.length}
            </span>
          )}
        </div>
        <p className="mb-3 text-[11px] text-[var(--muted-foreground)]">
          Clientes ativos sem orçamento mensal — não aparecem no pace.{" "}
          <Link href="/admin/clientes" className="text-[var(--primary)] hover:underline">
            Configurar →
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          {semOrcamento.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-[var(--muted-foreground)] transition hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]"
            >
              {c.logoUrl && (
                <Image src={c.logoUrl} alt={c.nome} width={16} height={16} className="h-4 w-4 rounded object-contain" unoptimized />
              )}
              {c.nome}
            </Link>
          ))}
          {semOrcamento.length === 0 && (
            <p className="text-[11px] text-emerald-400">✓ Todos os clientes têm orçamento cadastrado</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className ?? ""}`} />;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-[var(--primary)]",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-[22px] font-black leading-tight text-[var(--foreground)]">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function GestaoPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (!saved) {
      setTokenLoaded(true);
      return;
    }
    fetch("/api/admin/clientes", { headers: { "x-admin-token": saved } })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
        } else {
          setAdminToken(saved);
        }
      })
      .catch(() => {
        setAdminToken(saved);
      })
      .finally(() => setTokenLoaded(true));
  }, []);

  function makeHeaders(token: string): HeadersInit {
    return { "x-admin-token": token };
  }

  const enabled = !!adminToken && tokenLoaded;

  const paceQ = useQuery({
    queryKey: ["gestao-pace", adminToken],
    queryFn: async () => {
      const res = await fetch("/api/gestao/pace", { headers: makeHeaders(adminToken!) });
      if (res.status === 401) { setAdminToken(null); localStorage.removeItem("adminToken"); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Erro ao carregar pace");
      return res.json() as Promise<{
        diasNoMes: number; diasDecorridos: number; expectedPacePct: number; mes: string;
        clientes: PaceCliente[];
        semOrcamento: Array<{ id: string; nome: string; slug: string; logoUrl: string | null }>;
      }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const saldosQ = useQuery({
    queryKey: ["gestao-saldos", adminToken],
    queryFn: async () => {
      const res = await fetch("/api/gestao/saldos", { headers: makeHeaders(adminToken!) });
      if (res.status === 401) { setAdminToken(null); localStorage.removeItem("adminToken"); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Erro ao carregar saldos");
      return res.json() as Promise<{ contas: SaldoConta[] }>;
    },
    enabled,
    staleTime: 3 * 60 * 1000,
  });

  const anomaliasQ = useQuery({
    queryKey: ["gestao-anomalias", adminToken],
    queryFn: async () => {
      const res = await fetch("/api/gestao/anomalias", { headers: makeHeaders(adminToken!) });
      if (res.status === 401) { setAdminToken(null); localStorage.removeItem("adminToken"); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Erro ao carregar anomalias");
      return res.json() as Promise<{ anomalias: Anomalia[] }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  function handleLogin() {
    if (!inputToken.trim()) return;
    localStorage.setItem("adminToken", inputToken.trim());
    setAdminToken(inputToken.trim());
    setAuthError("");
  }

  if (!tokenLoaded) return null;

  if (!adminToken) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-[var(--card)] p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
              <Shield className="h-7 w-7 text-[var(--primary)]" />
            </div>
            <div className="text-center">
              <h1 className="text-[15px] font-bold text-[var(--foreground)]">Painel de Gestão</h1>
              <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                Área restrita — insira a senha de administrador.
              </p>
            </div>
          </div>
          <input
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Senha de admin"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm focus:border-[var(--primary)]/40 focus:outline-none"
          />
          {authError && <p className="mt-2 text-[11px] text-red-400">{authError}</p>}
          <button
            onClick={handleLogin}
            className="mt-3 w-full rounded-xl bg-[var(--primary)] py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const paceData = paceQ.data;
  const saldosData = saldosQ.data;
  const anomaliasData = anomaliasQ.data;

  const totalBudget = paceData
    ? paceData.clientes.reduce((s, c) => s + (c.budgetMeta ?? 0) + (c.budgetGoogle ?? 0), 0)
    : 0;
  const totalSpend = paceData
    ? paceData.clientes.reduce((s, c) => s + c.spendMeta + c.spendGoogle, 0)
    : 0;
  const overallPace =
    paceData && totalBudget > 0 && paceData.expectedPacePct > 0
      ? (totalSpend / ((totalBudget * paceData.expectedPacePct) / 100)) * 100
      : null;

  const alertasSaldo = saldosData?.contas.filter(
    (c) => c.diasRestantes !== null && c.diasRestantes < 7
  ).length ?? 0;
  const alertasAnomalia = anomaliasData?.anomalias.length ?? 0;
  const totalAlertas = alertasSaldo + alertasAnomalia;

  const isLoading = paceQ.isLoading || saldosQ.isLoading || anomaliasQ.isLoading;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-[1400px] px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15">
                <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <h1 className="text-[20px] font-black tracking-tight text-[var(--foreground)]">
                Painel de Gestão
              </h1>
            </div>
            <p className="mt-1 ml-11 text-[12px] text-[var(--muted-foreground)]">
              Visão geral de todos os projetos ativos
              {paceData && (
                <> · <span className="font-semibold text-[var(--foreground)]">{paceData.mes}</span> · dia {paceData.diasDecorridos}/{paceData.diasNoMes}</>
              )}
            </p>
          </div>
          <button
            onClick={() => { paceQ.refetch(); saldosQ.refetch(); anomaliasQ.refetch(); }}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-[11px] font-semibold text-[var(--muted-foreground)] transition hover:border-[var(--primary)]/30 hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {paceQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              <KpiCard
                label="Budget Total do Mês"
                value={fmtBrl(totalBudget)}
                sub={`${paceData?.clientes.length ?? 0} projetos com orçamento`}
                icon={CircleDollarSign}
              />
              <KpiCard
                label="Investido no Mês"
                value={fmtBrl(totalSpend)}
                sub={paceData ? `de ${fmtBrl(totalBudget)} planejados` : undefined}
                icon={TrendingUp}
                color="text-emerald-400"
              />
              <KpiCard
                label="Pace Geral"
                value={overallPace !== null ? fmtPct(overallPace) : "—"}
                sub={paceData ? `esperado: ${fmtPct(paceData.expectedPacePct)}` : undefined}
                icon={overallPace !== null && overallPace >= 90 ? Gauge : TrendingDown}
                color={
                  overallPace === null
                    ? "text-white/30"
                    : overallPace < 70
                    ? "text-red-400"
                    : overallPace < 90
                    ? "text-amber-400"
                    : overallPace <= 115
                    ? "text-emerald-400"
                    : "text-[var(--primary)]"
                }
              />
              <KpiCard
                label="Alertas Ativos"
                value={String(totalAlertas)}
                sub={`${alertasSaldo} saldo baixo · ${alertasAnomalia} anomali${alertasAnomalia === 1 ? "a" : "as"}`}
                icon={AlertTriangle}
                color={totalAlertas > 0 ? "text-amber-400" : "text-emerald-400"}
              />
            </>
          )}
        </div>

        {/* Pace Table */}
        <div className="mb-6">
          {paceQ.isLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : paceQ.error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center text-[12px] text-red-400">
              Erro ao carregar dados de pace.
            </div>
          ) : paceData ? (
            <PaceTable clientes={paceData.clientes} expectedPacePct={paceData.expectedPacePct} />
          ) : null}
        </div>

        {/* Bottom two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Saldos */}
          <div>
            {saldosQ.isLoading ? (
              <Skeleton className="h-80 rounded-2xl" />
            ) : saldosQ.error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center text-[12px] text-red-400">
                Erro ao carregar saldos.
              </div>
            ) : saldosData ? (
              <SaldosPanel contas={saldosData.contas} />
            ) : null}
          </div>

          {/* Anomalias + Sem orçamento */}
          <div>
            {anomaliasQ.isLoading || paceQ.isLoading ? (
              <Skeleton className="h-80 rounded-2xl" />
            ) : (
              <AnomaliasPanel
                anomalias={anomaliasData?.anomalias ?? []}
                semOrcamento={paceData?.semOrcamento ?? []}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
