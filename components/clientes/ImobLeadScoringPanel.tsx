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
  Legend,
} from "recharts";
import { Users, Target, TrendingUp, Zap, Building2, Clock, Wallet, RefreshCw, ChevronRight, ChevronUp, ChevronDown, ArrowLeft, BarChart3, Eye } from "lucide-react";
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
  "Até 3 meses": "#22c55e",
  "Ainda avaliando": "#94a3b8",
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
  "Sim": "#22c55e",
  "Não": "#ef4444",
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
  profile: "academy" | "icarai" | "mirante";
  selectedFormId?: string | null;
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
  campanhasHierarchy: {
    campaignId: string;
    campaignName: string | null;
    leadsMeta: number;
    leadsScored: number;
    mql: number;
    taxaMql: number;
    invest: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpl: number | null;
    adsets: {
      adsetId: string;
      adsetName: string;
      leadsMeta: number;
      leadsScored: number;
      mql: number;
      taxaMql: number;
      invest: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpl: number | null;
      ads: {
        adId: string;
        adName: string;
        leadsMeta: number;
        leadsScored: number;
        mql: number;
        taxaMql: number;
        invest: number;
        impressions: number;
        clicks: number;
        ctr: number;
        cpl: number | null;
      }[];
    }[];
  }[];
  formsRanking: { formId: string; formName: string | null; total: number; mql: number; taxaMql: number }[];
  periodoSeries: { periodo: string; total: number; mql: number }[];
  leads: {
    id: string;
    createdTime: string;
    fullName: string | null;
    telefone: string | null;
    emailLead: string | null;
    formId: string | null;
    formName: string | null;
    campaignId: string | null;
    campaignName: string | null;
    adsetId: string | null;
    adsetName: string | null;
    adId: string | null;
    adName: string | null;
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
  const [selectedFormId, setSelectedFormId] = React.useState<string | null>(null);
  const [showAllLeads, setShowAllLeads] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);
  type Camp = ApiResponse["campanhasHierarchy"][0];
  type Adset = Camp["adsets"][0];
  const [selectedCamp, setSelectedCamp] = React.useState<Camp | null>(null);
  const [selectedAdset, setSelectedAdset] = React.useState<Adset | null>(null);

  const params = new URLSearchParams();
  if (dateFilter.dataInicio) params.set("dataInicio", dateFilter.dataInicio);
  if (dateFilter.dataFim) params.set("dataFim", dateFilter.dataFim);
  params.set("agrupamento", agrupamento);
  if (gradeFilter) params.set("grade", gradeFilter);
  if (selectedFormId) params.set("formId", selectedFormId);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ["imob-lead-scoring", clienteId, dateFilter.dataInicio, dateFilter.dataFim, agrupamento, gradeFilter, selectedFormId],
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

  const { profile, kpis, gradeDistribuicao, timingDistribuicao, investDistribuicao, degreeDistribuicao, campanhasHierarchy, formsRanking, periodoSeries, leads, leadsTruncated } = data;
  const isAcademy = profile === "academy";
  const isMirante = profile === "mirante";

  // Client-side filtering: campanha → adset (formId é server-side agora)
  let displayedLeads = leads;
  if (selectedCamp) displayedLeads = displayedLeads.filter((l) => l.campaignId === selectedCamp.campaignId);
  if (selectedAdset) displayedLeads = displayedLeads.filter((l) => l.adsetId === selectedAdset.adsetId);

  const visibleLeads = showAllLeads ? displayedLeads : displayedLeads.slice(0, 20);
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

      {/* ── Seletor de Formulário ── */}
      {formsRanking.length > 1 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
            Formulário
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedFormId(null); setGradeFilter(null); }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                !selectedFormId
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:border-[var(--primary)]/20 hover:text-[var(--foreground)]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${!selectedFormId ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]"}`} />
              Todos os formulários
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${!selectedFormId ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                {formsRanking.reduce((s, f) => s + f.total, 0)}
              </span>
            </button>
            {formsRanking.map((f) => {
              const isActive = selectedFormId === f.formId;
              const mqlPct = f.total > 0 ? Math.round((f.mql / f.total) * 100) : 0;
              return (
                <button
                  key={f.formId}
                  onClick={() => { setSelectedFormId(isActive ? null : f.formId); setGradeFilter(null); }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                      : "border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:border-[var(--primary)]/20 hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]"}`} />
                  <span className="max-w-[200px] truncate">{f.formName ?? f.formId}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${isActive ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                    {f.total}
                  </span>
                  <span className="text-[10px] text-green-400">{mqlPct}% MQL</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!hasData ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-16 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-[var(--muted-foreground)]/40" />
          <p className="text-base font-semibold text-[var(--foreground)]">Nenhum lead encontrado</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Use o botão abaixo para importar os leads dos formulários Meta.
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

          {/* ── Qualificação — redesign completo ── */}
          {(() => {
            const ringR = 44;
            const ringC = 2 * Math.PI * ringR;
            const mqlPct = kpis.taxaMql;
            const fill = (mqlPct / 100) * ringC;
            return (
              <div className="grid gap-5 lg:grid-cols-5">
                {/* Lado esquerdo: anel + stats + (Icaraí: grade chips) */}
                <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Qualificação</p>
                  <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--foreground)]">
                    {isAcademy ? "Taxa de qualificados" : "Taxa MQL"}
                  </h3>

                  <div className="mt-5 flex items-center justify-between gap-6">
                    {/* Números */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-3xl font-black tabular-nums text-green-400">{kpis.totalMql}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {isAcademy ? "qualificados" : "MQL"}
                        </p>
                      </div>
                      <div className="h-px w-full bg-[var(--border)]" />
                      <div>
                        <p className="text-xl font-bold tabular-nums text-[var(--muted-foreground)]">{kpis.totalNonMql}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">não qualificados</p>
                      </div>
                    </div>

                    {/* SVG donut ring — lado direito */}
                    <div className="relative shrink-0">
                      <svg width="104" height="104" viewBox="0 0 104 104">
                        <circle cx="52" cy="52" r={ringR} fill="none" stroke="var(--border)" strokeWidth="11" />
                        <circle
                          cx="52" cy="52" r={ringR} fill="none"
                          stroke={mqlPct >= 70 ? "#22c55e" : mqlPct >= 40 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="11"
                          strokeDasharray={`${fill} ${ringC}`}
                          strokeLinecap="round"
                          transform="rotate(-90 52 52)"
                          style={{ transition: "stroke-dasharray 0.6s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black tabular-nums text-[var(--foreground)]">
                          {mqlPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Icaraí: grade chips clicáveis */}
                  {!isAcademy && (
                    <div className="mt-5 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Filtrar por grau</p>
                      <div className="flex flex-wrap gap-2">
                        {gradeDistribuicao.filter((g) => g.total > 0).map((g) => {
                          const isActive = gradeFilter === g.grade;
                          const color = GRADE_COLORS[g.grade] ?? "#94a3b8";
                          return (
                            <button
                              key={g.grade}
                              onClick={() => setGradeFilter(isActive ? null : g.grade)}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                                isActive
                                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                                  : "border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:border-[var(--primary)]/20 hover:text-[var(--foreground)]"
                              }`}
                            >
                              <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                                style={{ backgroundColor: color }}
                              >
                                {g.grade}
                              </span>
                              {g.total}
                              {g.isMql && <span className="text-green-400">●</span>}
                            </button>
                          );
                        })}
                        {gradeFilter && (
                          <button
                            onClick={() => setGradeFilter(null)}
                            className="rounded-full border border-[var(--primary)]/30 px-2 py-1 text-[10px] text-[var(--primary)] hover:bg-[var(--primary)]/8 transition-colors"
                          >
                            ✕ limpar
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Academy: dois pills Qualificado/Não qualificado clicáveis */}
                  {isAcademy && (
                    <div className="mt-5 flex gap-2">
                      {[
                        { grade: "A", label: "Qualificados", color: "#22c55e", count: kpis.totalMql },
                        { grade: "E", label: "Não qualificados", color: "#ef4444", count: kpis.totalNonMql },
                      ].map(({ grade, label, color, count }) => {
                        const isActive = gradeFilter === grade;
                        return (
                          <button
                            key={grade}
                            onClick={() => setGradeFilter(isActive ? null : grade)}
                            className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                              isActive
                                ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                                : "border-[var(--border)] bg-[var(--muted)]/30 hover:border-[var(--primary)]/20"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</span>
                            </div>
                            <p className="mt-1 text-2xl font-black tabular-nums" style={{ color }}>{count}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Lado direito: Academy = barras de formação; Icaraí = evolução temporal */}
                <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  {isAcademy ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Critério de qualificação</p>
                      <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--foreground)]">Formação acadêmica dos leads</h3>
                      {(degreeDistribuicao ?? []).length === 0 ? (
                        <p className="mt-6 text-sm text-[var(--muted-foreground)]">Sem dados de formação no período.</p>
                      ) : (
                        <div className="mt-5 space-y-3.5">
                          {(degreeDistribuicao ?? []).filter((d) => d.total > 0).map((d) => {
                            const pct = kpis.totalLeads > 0 ? (d.total / kpis.totalLeads) * 100 : 0;
                            const color = DEGREE_COLORS[d.degree] ?? "#94a3b8";
                            const maxCount = Math.max(...(degreeDistribuicao ?? []).map((x) => x.total), 1);
                            return (
                              <div key={d.degree}>
                                <div className="mb-1 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[12px] font-medium text-[var(--foreground)]">{d.degree}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold tabular-nums text-[var(--foreground)]">{d.total}</span>
                                    <span className="w-8 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">{pct.toFixed(0)}%</span>
                                  </div>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${(d.total / maxCount) * 100}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Evolução</p>
                      <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--foreground)]">Leads vs MQL no tempo</h3>
                      <div className="mt-4 h-[240px]">
                        {periodoSeries.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                            Sem dados para o período
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={periodoSeries.map((p) => ({ ...p, label: formatPeriodLabel(p.periodo), Leads: p.total, MQL: p.mql }))}
                              margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="imobBarGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.25} />
                                  <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.8} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                              <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                              <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name]} />
                              <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                              <Bar yAxisId="left" dataKey="Leads" fill="url(#imobBarGrad)" radius={[6, 6, 0, 0]} />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="MQL"
                                stroke="var(--primary)"
                                strokeWidth={2.5}
                                dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary)" }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Timing + Invest — Icaraí e Mirante */}
          {!isAcademy && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  {isMirante ? "Previsão de compra" : "Intenção de compra"}
                </p>
                <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-[var(--foreground)]">
                  {isMirante ? "Qual é sua previsão para compra?" : "Quando pretende adquirir?"}
                </h3>
                <div className="mt-4 space-y-3">
                  {timingDistribuicao.map((t) => {
                    const pct = kpis.totalLeads > 0 ? (t.total / kpis.totalLeads) * 100 : 0;
                    const color = TIMING_COLORS[t.timing] ?? "#94a3b8";
                    const maxCount = Math.max(...timingDistribuicao.map((x) => x.total), 1);
                    return (
                      <div key={t.timing}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[12px] font-medium text-[var(--foreground)]">{t.timing}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold tabular-nums text-[var(--foreground)]">{t.total}</span>
                            <span className="w-8 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(t.total / maxCount) * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                  {timingDistribuicao.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Campo não encontrado.</p>}
                </div>
              </div>

              {!isMirante && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  Capacidade financeira
                </p>
                <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-[var(--foreground)]">
                  Quanto pretende investir?
                </h3>
                <div className="mt-4 space-y-3">
                  {investDistribuicao.map((t) => {
                    const pct = kpis.totalLeads > 0 ? (t.total / kpis.totalLeads) * 100 : 0;
                    const color = INVEST_COLORS[t.invest] ?? "#94a3b8";
                    const maxCount = Math.max(...investDistribuicao.map((x) => x.total), 1);
                    return (
                      <div key={t.invest}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[12px] font-medium text-[var(--foreground)]">{t.invest}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold tabular-nums text-[var(--foreground)]">{t.total}</span>
                            <span className="w-8 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(t.total / maxCount) * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                  {investDistribuicao.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Campo não encontrado.</p>}
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── Origem — navegação page-by-page (CampanhasPanel-style) ── */}
          {(() => {
            const nivel = selectedAdset ? "anuncios" : selectedCamp ? "conjuntos" : "campanhas";
            const mqlLabel = isAcademy ? "Qualif." : "MQL";
            const fBrl = (n: number) => `R$\u00a0${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const fCtr = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
            const rowBg = (isTop: boolean) => isTop ? "bg-[var(--primary)]/[0.07]" : "bg-white/[0.03]";
            const countLabel =
              nivel === "campanhas" && campanhasHierarchy.length > 0 ? `${campanhasHierarchy.length} campanha${campanhasHierarchy.length !== 1 ? "s" : ""}` :
              nivel === "conjuntos" && selectedCamp ? `${selectedCamp.adsets.length} conjunto${selectedCamp.adsets.length !== 1 ? "s" : ""}` :
              nivel === "anuncios" && selectedAdset ? `${selectedAdset.ads.length} anúncio${selectedAdset.ads.length !== 1 ? "s" : ""}` : null;
            function goBack() { if (selectedAdset) setSelectedAdset(null); else setSelectedCamp(null); }

            return (
              <div>
                <SectionHeader sub="Origem" title="Análise por Campanha" />
                <div className="mt-4 rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)] overflow-hidden">

                  {/* Header */}
                  <div className="px-6 py-5 sm:px-8 border-b border-white/[0.05] flex items-center gap-4">
                    {selectedCamp && (
                      <button onClick={goBack} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      {selectedCamp && (
                        <nav className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mb-1 flex-wrap">
                          <button onClick={() => { setSelectedCamp(null); setSelectedAdset(null); }} className="hover:text-[var(--foreground)] hover:underline transition-colors">Campanhas</button>
                          <ChevronRight className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
                          <button
                            onClick={() => setSelectedAdset(null)}
                            className={`truncate max-w-[220px] transition-colors ${selectedAdset ? "hover:text-[var(--foreground)] hover:underline" : "text-[var(--foreground)] font-semibold"}`}
                          >
                            {selectedCamp.campaignName}
                          </button>
                          {selectedAdset && (
                            <>
                              <ChevronRight className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
                              <span className="text-[var(--foreground)] font-semibold truncate max-w-[220px]">{selectedAdset.adsetName}</span>
                            </>
                          )}
                        </nav>
                      )}
                      <h3 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-2xl flex items-center gap-2.5">
                        {nivel === "campanhas" && <BarChart3 className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
                        {nivel === "conjuntos" && <Target className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
                        {nivel === "anuncios" && <Eye className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />}
                        {nivel === "campanhas" && "Campanhas"}
                        {nivel === "conjuntos" && <>Conjuntos de <span className="bg-[linear-gradient(90deg,var(--accent),var(--primary))] bg-clip-text text-transparent">Anúncios</span></>}
                        {nivel === "anuncios" && "Anúncios"}
                      </h3>
                      {nivel === "campanhas" && (
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Clique em uma campanha para ver conjuntos e anúncios · leads da lista atualizam conforme a navegação
                        </p>
                      )}
                    </div>
                    {countLabel && (
                      <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--foreground)] flex-shrink-0">
                        {countLabel}
                      </span>
                    )}
                  </div>

                  {/* Table body */}
                  <div className="px-3 pb-5 pt-4 sm:px-5 sm:pb-6">

                    {/* ── Campanhas ── */}
                    {nivel === "campanhas" && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-separate [border-spacing:0_6px]">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Campanha</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Invest.</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Leads</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">{mqlLabel}</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CPL</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CTR</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {campanhasHierarchy.map((camp, ci) => {
                              const isTop = ci === 0;
                              const bg = rowBg(isTop);
                              const hasAdsets = camp.adsets.length > 0;
                              return (
                                <tr
                                  key={camp.campaignId}
                                  className={`group ${hasAdsets ? "cursor-pointer" : ""}`}
                                  onClick={() => { if (hasAdsets) { setSelectedCamp(camp); setSelectedAdset(null); } }}
                                >
                                  <td className={`rounded-l-2xl px-4 py-4 ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    <div className="flex items-start gap-2.5">
                                      {isTop
                                        ? <span className="mt-0.5 shrink-0 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--primary)]">#1</span>
                                        : <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-white/20">#{ci + 1}</span>
                                      }
                                      <p className="text-[12px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2 max-w-[360px]">{camp.campaignName ?? "—"}</p>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {camp.invest > 0 ? fBrl(camp.invest) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {camp.leadsScored > 0
                                      ? <span className={`text-[14px] font-bold ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{camp.leadsScored}</span>
                                      : camp.leadsMeta > 0
                                        ? <span className="text-[13px] text-[var(--muted-foreground)]" title="Leads reportados pelo Meta Ads (sem atribuição de webhook)">{camp.leadsMeta}</span>
                                        : <span className="text-[13px] text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {camp.mql > 0
                                      ? <span className={`text-[14px] font-bold ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{camp.mql}</span>
                                      : <span className="text-[13px] text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {camp.cpl != null ? fBrl(camp.cpl) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {camp.ctr > 0 ? fCtr(camp.ctr) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`rounded-r-2xl px-3 py-4 ${bg} ${hasAdsets ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {hasAdsets && <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors ml-auto" />}
                                  </td>
                                </tr>
                              );
                            })}
                            {campanhasHierarchy.length === 0 && (
                              <tr><td colSpan={7} className="py-10 text-center text-sm text-[var(--muted-foreground)]">Nenhuma campanha encontrada no período</td></tr>
                            )}
                            {campanhasHierarchy.length > 1 && (() => {
                              const totInvest = campanhasHierarchy.reduce((s, c) => s + c.invest, 0);
                              const totLeads = campanhasHierarchy.reduce((s, c) => s + c.leadsScored, 0);
                              const totMql = campanhasHierarchy.reduce((s, c) => s + c.mql, 0);
                              const totClicks = campanhasHierarchy.reduce((s, c) => s + c.clicks, 0);
                              const totImpressions = campanhasHierarchy.reduce((s, c) => s + c.impressions, 0);
                              const totCtr = totImpressions > 0 ? totClicks / totImpressions * 100 : 0;
                              const totCpl = totLeads > 0 && totInvest > 0 ? totInvest / totLeads : null;
                              return (
                                <tr>
                                  <td className="rounded-l-2xl px-4 py-3 bg-white/[0.03] border-t border-[var(--border)]/40">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Total</p>
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)] bg-white/[0.03] border-t border-[var(--border)]/40">
                                    {totInvest > 0 ? fBrl(totInvest) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[13px] font-bold text-[var(--foreground)] bg-white/[0.03] border-t border-[var(--border)]/40">
                                    {totLeads > 0 ? totLeads : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[13px] font-bold text-[var(--primary)] bg-white/[0.03] border-t border-[var(--border)]/40">
                                    {totMql > 0 ? totMql : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[13px] font-semibold text-[var(--foreground)] bg-white/[0.03] border-t border-[var(--border)]/40">
                                    {totCpl != null ? fBrl(totCpl) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] bg-white/[0.03] border-t border-[var(--border)]/40">
                                    {totCtr > 0 ? fCtr(totCtr) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className="rounded-r-2xl px-3 py-3 bg-white/[0.03] border-t border-[var(--border)]/40" />
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Conjuntos ── */}
                    {nivel === "conjuntos" && selectedCamp && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] border-separate [border-spacing:0_6px]">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Conjunto de Anúncios</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Invest.</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Leads</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">{mqlLabel}</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CPL</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CTR</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Anúncios</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCamp.adsets.map((adset, ai) => {
                              const isTop = ai === 0;
                              const bg = rowBg(isTop);
                              const hasAds = adset.ads.length > 0;
                              return (
                                <tr
                                  key={adset.adsetId}
                                  className={`group ${hasAds ? "cursor-pointer" : ""}`}
                                  onClick={() => { if (hasAds) setSelectedAdset(adset); }}
                                >
                                  <td className={`rounded-l-2xl px-4 py-4 ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    <div className="flex items-start gap-2.5">
                                      {isTop
                                        ? <span className="mt-0.5 shrink-0 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--primary)]">#1</span>
                                        : <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-white/20">#{ai + 1}</span>
                                      }
                                      <p className="text-[12px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2 max-w-[360px]">{adset.adsetName}</p>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {fBrl(adset.invest)}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] ${isTop && adset.leadsMeta > 0 ? "text-[var(--primary)] font-bold text-[15px]" : "text-[var(--muted-foreground)]"} ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {adset.leadsMeta > 0 ? adset.leadsMeta : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {adset.mql > 0
                                      ? <span className={`text-[13px] font-bold ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{adset.mql}</span>
                                      : adset.leadsScored === 0
                                        ? <span className="text-[13px] text-white/20">—</span>
                                        : <span className="text-[13px] font-bold text-[var(--muted-foreground)]">0</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {adset.cpl != null ? fBrl(adset.cpl) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] ${adset.ctr >= 1 ? "text-emerald-400 font-semibold" : "text-[var(--muted-foreground)]"} ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {adset.ctr > 0 ? fCtr(adset.ctr) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {adset.ads.length}
                                  </td>
                                  <td className={`rounded-r-2xl px-3 py-4 ${bg} ${hasAds ? "transition-colors group-hover:bg-[var(--primary)]/[0.10]" : ""}`}>
                                    {hasAds && <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[var(--primary)] transition-colors ml-auto" />}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Anúncios ── */}
                    {nivel === "anuncios" && selectedAdset && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] border-separate [border-spacing:0_6px]">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Anúncio</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Invest.</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">Leads</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">{mqlLabel}</th>
                              <th className="pb-2 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CPL</th>
                              <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-[0.20em] text-[var(--muted-foreground)]">CTR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAdset.ads.map((ad, adi) => {
                              const isTop = adi === 0;
                              const bg = rowBg(isTop);
                              return (
                                <tr key={ad.adId}>
                                  <td className={`rounded-l-2xl px-4 py-4 ${bg}`}>
                                    <div className="flex items-start gap-2.5">
                                      {isTop
                                        ? <span className="mt-0.5 shrink-0 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--primary)]">#1</span>
                                        : <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-white/20">#{adi + 1}</span>
                                      }
                                      <p className="text-[12px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2 max-w-[360px]">{ad.adName}</p>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                                    {fBrl(ad.invest)}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] ${isTop && ad.leadsMeta > 0 ? "text-[var(--primary)] font-bold text-[15px]" : "text-[var(--muted-foreground)]"} ${bg}`}>
                                    {ad.leadsMeta > 0 ? ad.leadsMeta : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums ${bg}`}>
                                    {ad.mql > 0
                                      ? <span className={`text-[13px] font-bold ${isTop ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{ad.mql}</span>
                                      : ad.leadsScored === 0
                                        ? <span className="text-[13px] text-white/20">—</span>
                                        : <span className="text-[13px] font-bold text-[var(--muted-foreground)]">0</span>}
                                  </td>
                                  <td className={`px-4 py-4 text-right tabular-nums text-[13px] text-[var(--muted-foreground)] ${bg}`}>
                                    {ad.cpl != null ? fBrl(ad.cpl) : <span className="text-white/20">—</span>}
                                  </td>
                                  <td className={`rounded-r-2xl px-4 py-4 text-right tabular-nums text-[13px] ${ad.ctr >= 1 ? "text-emerald-400 font-semibold" : "text-[var(--muted-foreground)]"} ${bg}`}>
                                    {ad.ctr > 0 ? fCtr(ad.ctr) : <span className="text-white/20">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })()}

          {/* Formulários — clicáveis para filtrar leads (espelho do seletor de topo) */}
          <div>
            <div className="flex items-center justify-between">
              <SectionHeader sub="Origem" title={isAcademy ? "Leads por Formulário" : "MQL por Formulário"} />
              {selectedFormId && (
                <button
                  onClick={() => setSelectedFormId(null)}
                  className="text-xs text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                >
                  ✕ limpar filtro
                </button>
              )}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Formulário</th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Leads</th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{isAcademy ? "Qualif." : "MQL"}</th>
                    <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Taxa</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {formsRanking.slice(0, 8).map((f) => {
                    const isActive = selectedFormId === f.formId;
                    return (
                      <tr
                        key={f.formId}
                        onClick={() => { setSelectedFormId(isActive ? null : f.formId); setGradeFilter(null); }}
                        className={`cursor-pointer transition-colors ${
                          isActive
                            ? "bg-[var(--primary)]/8"
                            : "hover:bg-[var(--muted)]/30"
                        }`}
                      >
                        <td className="py-2.5 pr-3 text-xs text-[var(--foreground)]">
                          <div className="flex items-center gap-2">
                            {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />}
                            <span className="line-clamp-1">{f.formName ?? "—"}</span>
                          </div>
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
                        <td className="py-2.5 pl-2">
                          <ChevronRight className={`ml-auto h-3 w-3 transition-colors ${isActive ? "text-[var(--primary)]" : "text-white/15"}`} />
                        </td>
                      </tr>
                    );
                  })}
                  {formsRanking.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[var(--muted-foreground)]">Nenhum formulário encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela de leads individuais */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeader sub="Leads" title="Lista detalhada" />
              <div className="flex flex-wrap items-center gap-2">
                {/* Chips de filtros ativos */}
                {selectedCamp && (
                  <span className="flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]">
                    <span className="text-[var(--primary)]">Campanha:</span>
                    <span className="max-w-[140px] truncate">{selectedCamp.campaignName}</span>
                    <button onClick={() => { setSelectedCamp(null); setSelectedAdset(null); }} className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
                  </span>
                )}
                {selectedAdset && (
                  <span className="flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]">
                    <span className="text-[var(--primary)]">Conjunto:</span>
                    <span className="max-w-[120px] truncate">{selectedAdset.adsetName}</span>
                    <button onClick={() => setSelectedAdset(null)} className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
                  </span>
                )}
                {selectedFormId && (
                  <span className="flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]">
                    <span className="text-[var(--primary)]">Form:</span>
                    <span className="max-w-[120px] truncate">{formsRanking.find((f) => f.formId === selectedFormId)?.formName ?? selectedFormId}</span>
                    <button onClick={() => setSelectedFormId(null)} className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
                  </span>
                )}
                <span className="text-xs text-[var(--muted-foreground)]">
                  {displayedLeads.length} lead{displayedLeads.length !== 1 ? "s" : ""}
                  {leadsTruncated && !selectedCamp && !selectedAdset && !selectedFormId ? " (limitado a 500)" : ""}
                </span>
              </div>
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
                    Ver todos os {displayedLeads.length} leads
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
