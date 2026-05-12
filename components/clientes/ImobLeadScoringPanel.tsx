"use client";

import React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { Users, Target, TrendingUp, Zap, Building2, Clock, Wallet, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { DateFilter } from "@/app/clientes/[id]/ClienteDashboard";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--foreground)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    padding: "10px 14px",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", fontSize: 13 },
};

function fmt(n: number | null | undefined, prefix = "R$ "): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}k`;
  return `${prefix}${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#f59e0b",
  D: "#94a3b8",
  E: "#ef4444",
};

const TIMING_COLORS: Record<string, string> = {
  "Agora": "#22c55e",
  "3 a 6 meses": "#f59e0b",
  "Estou avaliando": "#94a3b8",
  "6 meses": "#22c55e",
  "1 ano": "#84cc16",
  "Avaliando": "#94a3b8",
  "Não informado": "#475569",
};

const INVEST_COLORS: Record<string, string> = {
  "Acima de R$ 1M": "#22c55e",
  "R$ 700k – 1M": "#84cc16",
  "R$ 500k – 700k": "#f59e0b",
  "R$ 300k – 500k": "#fb923c",
  "Até R$ 300k": "#ef4444",
  "O quanto for necessário": "#22c55e",
  "Mais de R$5k": "#84cc16",
  "Até R$5k": "#f59e0b",
  "Menos de R$5k": "#ef4444",
  "Não informado": "#475569",
};

const DEGREE_COLORS: Record<string, string> = {
  "Mestre/Doutor": "#22c55e",
  "Doutorando": "#84cc16",
  "Mestrando": "#84cc16",
  "Grad. Completa": "#f59e0b",
  "Graduando": "#fb923c",
  "Sem graduação": "#ef4444",
  "Não informado": "#475569",
};

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  highlight,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
        highlight
          ? "border-green-500/30 bg-green-500/6 hover:border-green-500/50"
          : accent
          ? "border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.07] ${
          highlight ? "bg-green-500" : "bg-[var(--primary)]"
        }`}
      />
      <div className="mb-2 flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${highlight ? "text-green-400" : accent ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
        />
        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${highlight ? "text-green-400" : "text-[var(--muted-foreground)]"}`}>
          {title}
        </span>
      </div>
      <p className={`text-2xl font-extrabold tabular-nums ${highlight ? "text-green-400" : "text-[var(--foreground)]"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{sub}</p>
    </div>
  );
}

interface ApiResponse {
  profile: "academy" | "icarai";
  kpis: {
    totalLeads: number;
    totalMql: number;
    totalNonMql: number;
    totalInvestimento: number;
    cplMedio: number | null;
    custoMql: number | null;
    taxaMql: number;
  };
  gradeDistribuicao: { grade: string; total: number; label: string; isMql: boolean }[];
  timingDistribuicao: { timing: string; total: number }[];
  investDistribuicao: { invest: string; total: number }[];
  degreeDistribuicao?: { degree: string; total: number }[] | null;
  campanhasRanking: { campaignId: string; campaignName: string | null; total: number; mql: number; taxaMql: number }[];
  formsRanking: { formId: string; formName: string | null; total: number; mql: number; taxaMql: number }[];
  adsetRanking: { adsetName: string; total: number; mql: number; taxaMql: number }[];
  adRanking: { adName: string; adsetName: string | null; total: number; mql: number; taxaMql: number }[];
  periodoSeries: { periodo: string; total: number; mql: number }[];
  leads: {
    id: string;
    createdTime: string;
    fullName: string | null;
    telefone: string | null;
    emailLead: string | null;
    formName: string | null;
    campaignName: string | null;
    adName: string | null;
    adsetName: string | null;
    platform: string | null;
    grade: string;
    isMql: boolean;
    timingLabel: string;
    investLabel: string;
    degreeLabel?: string | null;
  }[];
  leadsTruncated: boolean;
  totalFiltered: number;
  agrupamento: string;
  dataInicio: string;
  dataFim: string;
}

function SectionHeader({ sub, title }: { sub: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">{sub}</p>
        <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">{title}</h2>
      </div>
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  semanal: "semanal",
  mensal: "mensal",
};

function formatPeriodLabel(key: string): string {
  if (/^\d{4}-S\d{2}$/.test(key)) {
    const [year, week] = key.split("-S");
    return `S${week}/${year?.slice(2)}`;
  }
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month ?? "1", 10) - 1]}/${year?.slice(2)}`;
  }
  return key;
}

export function ImobLeadScoringPanel({
  clienteId,
  dateFilter,
  clienteNome,
}: {
  clienteId: string;
  dateFilter: DateFilter;
  clienteNome?: string;
}) {
  const [agrupamento, setAgrupamento] = React.useState<"semanal" | "mensal">("semanal");
  const [gradeFilter, setGradeFilter] = React.useState<string | null>(null);
  const [showAllLeads, setShowAllLeads] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);

  const params = new URLSearchParams();
  if (dateFilter.dataInicio) params.set("dataInicio", dateFilter.dataInicio);
  if (dateFilter.dataFim) params.set("dataFim", dateFilter.dataFim);
  params.set("agrupamento", agrupamento);
  if (gradeFilter) params.set("grade", gradeFilter);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ["imob-lead-scoring", clienteId, dateFilter.dataInicio, dateFilter.dataFim, agrupamento, gradeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${clienteId}/lead-scoring-imob?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000,
  });

  async function triggerLeadSync() {
    setSyncStatus("syncing");
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/sync-leads`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSyncStatus("error");
        setSyncMsg(json.error ?? "Erro ao sincronizar leads");
      } else {
        setSyncStatus("ok");
        const created = json.leadsCreated ?? 0;
        const forms = json.formsFound ?? 0;
        setSyncMsg(`${forms} formulário${forms !== 1 ? "s" : ""} · ${json.leadsProcessed ?? 0} leads processados · ${created} novo${created !== 1 ? "s" : ""}`);
        await refetch();
      }
    } catch (e) {
      setSyncStatus("error");
      setSyncMsg(e instanceof Error ? e.message : "Erro desconhecido");
    }
    setTimeout(() => { if (syncStatus !== "syncing") setSyncStatus("idle"); }, 6000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-5 w-5 animate-spin text-[var(--primary)]" />
        <span className="ml-3 text-sm text-[var(--muted-foreground)]">Carregando leads…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-6 py-10 text-center">
        <p className="text-sm text-red-400">{error instanceof Error ? error.message : "Erro ao carregar leads."}</p>
      </div>
    );
  }

  if (!data) return null;

  const { profile, kpis, gradeDistribuicao, timingDistribuicao, investDistribuicao, degreeDistribuicao, campanhasRanking, formsRanking, adsetRanking, adRanking, periodoSeries, leads, leadsTruncated, totalFiltered } = data;
  const isAcademy = profile === "academy";

  const visibleLeads = showAllLeads ? leads : leads.slice(0, 20);
  const hasData = kpis.totalLeads > 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader sub="Meta Lead Ads · Qualificação" title={`Lead Scoring${clienteNome ? ` — ${clienteNome}` : ""}`} />
        <div className="flex flex-wrap items-center gap-2">
          {(["semanal", "mensal"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAgrupamento(a)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${
                agrupamento === a
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {PERIOD_LABELS[a]}
            </button>
          ))}

          {/* Sync leads button */}
          <button
            onClick={triggerLeadSync}
            disabled={syncStatus === "syncing"}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              syncStatus === "syncing"
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/8 text-[var(--primary)] cursor-wait"
                : syncStatus === "ok"
                ? "border-green-500/40 bg-green-500/8 text-green-400"
                : syncStatus === "error"
                ? "border-red-500/40 bg-red-500/8 text-red-400"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            {syncStatus === "syncing" ? "Sincronizando…" : syncStatus === "ok" ? "Atualizado!" : syncStatus === "error" ? "Erro" : "Sincronizar leads"}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Recarregar dados do banco"
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 text-[var(--muted-foreground)] transition-all hover:text-[var(--foreground)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sync result message */}
      {syncMsg && (
        <div className={`-mt-6 rounded-xl border px-4 py-2.5 text-xs ${
          syncStatus === "error"
            ? "border-red-500/20 bg-red-500/6 text-red-400"
            : "border-green-500/20 bg-green-500/6 text-green-400"
        }`}>
          {syncMsg}
        </div>
      )}

      {!hasData ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-16 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-[var(--muted-foreground)]/40" />
          <p className="text-base font-semibold text-[var(--foreground)]">Nenhum lead encontrado</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Use o botão abaixo para importar os leads dos formulários Meta do Sou+ Icaraí.
          </p>
          <button
            onClick={triggerLeadSync}
            disabled={syncStatus === "syncing"}
            className={`mt-5 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all ${
              syncStatus === "syncing"
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/8 text-[var(--primary)] cursor-wait"
                : syncStatus === "error"
                ? "border-red-500/40 bg-red-500/8 text-red-400"
                : "border-[var(--primary)]/30 bg-[var(--primary)]/8 text-[var(--primary)] hover:bg-[var(--primary)]/15"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            {syncStatus === "syncing" ? "Sincronizando formulários Meta…" : "Sincronizar leads agora"}
          </button>
          {syncMsg && (
            <p className={`mt-3 text-xs ${syncStatus === "error" ? "text-red-400" : "text-green-400"}`}>
              {syncMsg}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              title="Total de Leads"
              value={kpis.totalLeads.toString()}
              sub="formulários preenchidos"
              icon={Users}
            />
            <KpiCard
              title={isAcademy ? "Qualificados" : "MQL"}
              value={kpis.totalMql.toString()}
              sub={isAcademy ? "com graduação" : "leads qualificados"}
              icon={Target}
              highlight
            />
            <KpiCard
              title={isAcademy ? "Taxa Qualif." : "Taxa MQL"}
              value={fmtPct(kpis.taxaMql)}
              sub={isAcademy ? "dos leads qualificados" : "dos leads são MQL"}
              icon={TrendingUp}
              accent
            />
            <KpiCard
              title="CPL Médio"
              value={fmt(kpis.cplMedio)}
              sub="custo por lead"
              icon={Wallet}
            />
            <KpiCard
              title={isAcademy ? "Custo/Qualificado" : "Custo por MQL"}
              value={fmt(kpis.custoMql)}
              sub="investimento / qualificado"
              icon={Zap}
              accent
            />
            <KpiCard
              title="Não qualificados"
              value={kpis.totalNonMql.toString()}
              sub="sem graduação"
              icon={Clock}
            />
          </div>

          {/* Grade breakdown + MQL explanation */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Grade cards */}
            <div className="lg:col-span-1 space-y-3">
              <SectionHeader
                sub="Qualificação"
                title={isAcademy ? "Qualificados vs Não qualificados" : "Graus MQL"}
              />
              <div className="space-y-2">
                {(isAcademy
                  ? gradeDistribuicao.filter((g) => g.grade === "A" || g.grade === "E")
                  : gradeDistribuicao
                ).map((g) => {
                  const pct = kpis.totalLeads > 0 ? (g.total / kpis.totalLeads) * 100 : 0;
                  const isActive = gradeFilter === g.grade;
                  const academyColor = g.grade === "A" ? "#22c55e" : "#ef4444";
                  const color = isAcademy ? academyColor : GRADE_COLORS[g.grade];
                  const academyLabel = g.grade === "A" ? "Qualificado" : "Não qualificado";
                  return (
                    <button
                      key={g.grade}
                      onClick={() => setGradeFilter(isActive ? null : g.grade)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        isActive
                          ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/20 hover:bg-[var(--muted)]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isAcademy ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: `${color}20`, color }}
                            >
                              {academyLabel}
                            </span>
                          ) : (
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white"
                              style={{ backgroundColor: color }}
                            >
                              {g.grade}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-[var(--foreground)]">{g.total} leads</span>
                          {!isAcademy && g.isMql && (
                            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-400">
                              MQL
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold tabular-nums text-[var(--muted-foreground)]">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      {!isAcademy && (
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{g.label}</p>
                      )}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              {gradeFilter && (
                <button
                  onClick={() => setGradeFilter(null)}
                  className="text-xs text-[var(--primary)] underline underline-offset-2"
                >
                  Limpar filtro
                </button>
              )}
            </div>

            {/* Right panel: Academy = degree distribution chart; Icaraí = time series */}
            <div className="lg:col-span-2">
              {isAcademy ? (
                <>
                  <SectionHeader sub="Critério de qualificação" title="Formação acadêmica dos leads" />
                  <div className="mt-4 h-[280px]">
                    {(degreeDistribuicao ?? []).length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                        Sem dados de formação no período
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={(degreeDistribuicao ?? []).map((d) => ({
                            degree: d.degree,
                            total: d.total,
                            pct: kpis.totalLeads > 0 ? Math.round((d.total / kpis.totalLeads) * 100) : 0,
                            color: DEGREE_COLORS[d.degree] ?? "#94a3b8",
                          }))}
                          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="degree" tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={110} />
                          <Tooltip
                            {...tooltipStyle}
                            formatter={(v: number, _: string, entry: { payload?: { pct?: number } }) => [
                              `${v} lead${v !== 1 ? "s" : ""} (${entry.payload?.pct ?? 0}%)`,
                              "Total",
                            ]}
                          />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {(degreeDistribuicao ?? []).map((d) => (
                              <Cell key={d.degree} fill={DEGREE_COLORS[d.degree] ?? "#94a3b8"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <SectionHeader sub="Evolução" title="Leads vs MQL no tempo" />
                  <div className="mt-4 h-[280px]">
                    {periodoSeries.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                        Sem dados para o período
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={periodoSeries.map((p) => ({ ...p, label: formatPeriodLabel(p.periodo) }))} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name === "total" ? "Total" : "MQL"]} />
                          <Bar dataKey="total" fill="var(--border)" radius={[3, 3, 0, 0]} name="Total" opacity={0.6} />
                          <Bar dataKey="mql" fill="#22c55e" radius={[3, 3, 0, 0]} name="MQL" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timing + Invest breakdown — Icaraí only (Academy fields are not captured in the form) */}
          {!isAcademy && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Timing */}
              <div>
                <SectionHeader sub="Intenção de compra" title="Quando pretende adquirir?" />
                <div className="mt-4 space-y-2">
                  {timingDistribuicao.map((t) => {
                    const pct = kpis.totalLeads > 0 ? (t.total / kpis.totalLeads) * 100 : 0;
                    const color = TIMING_COLORS[t.timing] ?? "#94a3b8";
                    return (
                      <div key={t.timing} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-[var(--foreground)]">{t.timing}</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="w-20 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                          {t.total} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                  {timingDistribuicao.length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">Campo de prazo não encontrado.</p>
                  )}
                </div>
              </div>

              {/* Investment */}
              <div>
                <SectionHeader sub="Capacidade financeira" title="Quanto pretende investir?" />
                <div className="mt-4 space-y-2">
                  {investDistribuicao.map((t) => {
                    const pct = kpis.totalLeads > 0 ? (t.total / kpis.totalLeads) * 100 : 0;
                    const color = INVEST_COLORS[t.invest] ?? "#94a3b8";
                    return (
                      <div key={t.invest} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-[var(--foreground)]">{t.invest}</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="w-20 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                          {t.total} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                  {investDistribuicao.length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">Campo de investimento não encontrado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Campanhas + Formulários */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campanhas */}
            <div>
              <SectionHeader sub="Origem" title={isAcademy ? "Leads por Campanha" : "MQL por Campanha"} />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Campanha</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Leads</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{isAcademy ? "Qualif." : "MQL"}</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {campanhasRanking.slice(0, 8).map((c) => (
                      <tr key={c.campaignId} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                          <span className="line-clamp-1">{c.campaignName ?? "—"}</span>
                        </td>
                        <td className="py-2.5 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{c.total}</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-green-400">
                            {c.mql}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                          {fmtPct(c.taxaMql)}
                        </td>
                      </tr>
                    ))}
                    {campanhasRanking.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted-foreground)]">Nenhuma campanha encontrada</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formulários */}
            <div>
              <SectionHeader sub="Origem" title={isAcademy ? "Leads por Formulário" : "MQL por Formulário"} />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Formulário</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Leads</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{isAcademy ? "Qualif." : "MQL"}</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {formsRanking.slice(0, 8).map((f) => (
                      <tr key={f.formId} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                          <span className="line-clamp-1">{f.formName ?? "—"}</span>
                        </td>
                        <td className="py-2.5 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{f.total}</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-green-400">
                            {f.mql}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                          {fmtPct(f.taxaMql)}
                        </td>
                      </tr>
                    ))}
                    {formsRanking.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted-foreground)]">Nenhum formulário encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Adset + Ad ranking — Academy only */}
          {isAcademy && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Conjuntos */}
              <div>
                <SectionHeader sub="Origem detalhada" title="Leads por Conjunto de Anúncios" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Conjunto</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Leads</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Qualif.</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Taxa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {adsetRanking.slice(0, 10).map((a) => (
                        <tr key={a.adsetName} className="hover:bg-[var(--muted)]/30 transition-colors">
                          <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                            <span className="line-clamp-1">{a.adsetName}</span>
                          </td>
                          <td className="py-2.5 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{a.total}</td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex items-center justify-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-green-400">
                              {a.mql}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                            {fmtPct(a.taxaMql)}
                          </td>
                        </tr>
                      ))}
                      {adsetRanking.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted-foreground)]">Nenhum conjunto encontrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anúncios */}
              <div>
                <SectionHeader sub="Origem detalhada" title="Leads por Anúncio" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Anúncio</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Leads</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Qualif.</th>
                        <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Taxa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {adRanking.slice(0, 10).map((a) => (
                        <tr key={a.adName} className="hover:bg-[var(--muted)]/30 transition-colors">
                          <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                            <div className="line-clamp-1">{a.adName}</div>
                            {a.adsetName && (
                              <div className="text-[10px] text-[var(--muted-foreground)] line-clamp-1">{a.adsetName}</div>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-xs tabular-nums text-[var(--muted-foreground)]">{a.total}</td>
                          <td className="py-2.5 text-right">
                            <span className="inline-flex items-center justify-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-green-400">
                              {a.mql}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                            {fmtPct(a.taxaMql)}
                          </td>
                        </tr>
                      ))}
                      {adRanking.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted-foreground)]">Nenhum anúncio encontrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de leads individuais */}
          <div>
            <div className="flex items-center justify-between">
              <SectionHeader
                sub="Todos os Leads"
                title={`Lista detalhada${gradeFilter ? (isAcademy ? ` — ${gradeFilter === "A" ? "Qualificados" : "Não qualificados"}` : ` — Grau ${gradeFilter}`) : ""}`}
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                {totalFiltered} lead{totalFiltered !== 1 ? "s" : ""}
                {leadsTruncated ? " (limitado a 500)" : ""}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className={`w-full text-sm ${isAcademy ? "min-w-[900px]" : "min-w-[820px]"}`}>
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {(isAcademy
                      ? ["Data", "Nome", "Status", "Formação", "Formulário", "Campanha", "Conjunto", "Anúncio"]
                      : ["Data", "Nome", "Grau", "Timing", "Investimento", "Formulário", "Campanha", "Plataforma"]
                    ).map((h) => (
                      <th key={h} className="pb-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-2.5 pr-3 text-xs tabular-nums text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(lead.createdTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                        <div className="max-w-[130px] truncate">{lead.fullName ?? "—"}</div>
                        {lead.telefone && (
                          <div className="text-[10px] text-[var(--muted-foreground)]">{lead.telefone}</div>
                        )}
                      </td>

                      {/* Status — Academy: Qualificado/Não qualificado pill; Icaraí: letter grade badge */}
                      {isAcademy ? (
                        <td className="py-2.5 pr-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                            style={
                              lead.isMql
                                ? { backgroundColor: "#22c55e20", color: "#22c55e" }
                                : { backgroundColor: "#ef444420", color: "#ef4444" }
                            }
                          >
                            {lead.isMql ? "Qualificado" : "Não qualificado"}
                          </span>
                        </td>
                      ) : (
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                              style={{ backgroundColor: GRADE_COLORS[lead.grade] }}
                            >
                              {lead.grade}
                            </span>
                            {lead.isMql && (
                              <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-400">
                                MQL
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Academy: Formação pill */}
                      {isAcademy ? (
                        <td className="py-2.5 pr-3 text-xs">
                          {lead.degreeLabel ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                              style={{
                                backgroundColor: `${DEGREE_COLORS[lead.degreeLabel] ?? "#94a3b8"}20`,
                                color: DEGREE_COLORS[lead.degreeLabel] ?? "#94a3b8",
                              }}
                            >
                              {lead.degreeLabel}
                            </span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      ) : (
                        /* Icaraí: Timing pill */
                        <td className="py-2.5 pr-3 text-xs">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${TIMING_COLORS[lead.timingLabel] ?? "#94a3b8"}20`,
                              color: TIMING_COLORS[lead.timingLabel] ?? "#94a3b8",
                            }}
                          >
                            {lead.timingLabel}
                          </span>
                        </td>
                      )}

                      {/* Icaraí only: Investimento */}
                      {!isAcademy && (
                        <td className="py-2.5 pr-3 text-xs">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${INVEST_COLORS[lead.investLabel] ?? "#94a3b8"}20`,
                              color: INVEST_COLORS[lead.investLabel] ?? "#94a3b8",
                            }}
                          >
                            {lead.investLabel}
                          </span>
                        </td>
                      )}

                      <td className="py-2.5 pr-3 text-xs text-[var(--muted-foreground)]">
                        <div className="max-w-[120px] truncate">{lead.formName ?? "—"}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-[var(--muted-foreground)]">
                        <div className="max-w-[120px] truncate">{lead.campaignName ?? "—"}</div>
                      </td>

                      {/* Academy: Conjunto + Anúncio; Icaraí: Plataforma */}
                      {isAcademy ? (
                        <>
                          <td className="py-2.5 pr-3 text-xs text-[var(--muted-foreground)]">
                            <div className="max-w-[120px] truncate">{lead.adsetName ?? "—"}</div>
                          </td>
                          <td className="py-2.5 text-xs text-[var(--muted-foreground)]">
                            <div className="max-w-[120px] truncate">{lead.adName ?? "—"}</div>
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 text-xs text-[var(--muted-foreground)] capitalize">
                          {lead.platform ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[var(--muted-foreground)]">
                        Nenhum lead encontrado para os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {leads.length > 20 && (
              <button
                onClick={() => setShowAllLeads((v) => !v)}
                className="mt-3 flex items-center gap-1.5 text-xs text-[var(--primary)] underline underline-offset-2"
              >
                {showAllLeads ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Ver todos os {leads.length} leads
                  </>
                )}
              </button>
            )}
          </div>

          {/* Legenda MQL */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Critérios de qualificação MQL
            </p>
            {isAcademy ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { color: "#22c55e", title: "Qualificado", desc: "Lead tem graduação (cursando ou completa, em qualquer nível)" },
                  { color: "#ef4444", title: "Não qualificado", desc: "Lead não informou ou não possui nenhuma graduação" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color, marginTop: 4 }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { grade: "A", color: "#22c55e", title: "Hot MQL", desc: "Agora + R$ 700k ou acima de R$ 1M" },
                  { grade: "B", color: "#84cc16", title: "MQL", desc: "Agora + R$ 300k até R$ 700k" },
                  { grade: "C", color: "#f59e0b", title: "MQL Morno", desc: "3 a 6 meses + qualquer valor acima de R$ 300k" },
                  { grade: "D", color: "#94a3b8", title: "Potencial", desc: "Avaliando, mas com orçamento qualificado (≥ R$ 300k)" },
                ].map((item) => (
                  <div key={item.grade} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.grade}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
