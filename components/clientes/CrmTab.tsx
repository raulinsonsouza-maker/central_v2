"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FunilCrmSection } from "@/components/clientes/FunilCrmSection";
import { RefreshCw, Inbox, TrendingUp, Star } from "lucide-react";

type Period = "month" | "3months" | "ytd" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  month: "Este mês",
  "3months": "3 meses",
  ytd: "Ano atual",
  all: "Tudo",
};

interface Lead {
  id: string;
  crmLeadId: string;
  etapa: string;
  valor: number | null;
  dataEntrada: string;
  dataFechamento: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  contato: string | null;
  fonte: string | null;
  rating: number | null;
  status: string | null;
  dadosMarketing?: {
    faturamento?: string | null;
    segmento?: string | null;
    investimento?: string | null;
    interesse?: string | null;
    cargo?: string | null;
    origemMarketing?: string | null;
    eventoConversao?: string | null;
    empresa?: string | null;
    lifecycleStage?: string | null;
  } | null;
}

interface PorFonte {
  fonte: string;
  canal: "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO";
  leads: number;
  ganhos: number;
  perdidos: number;
  andamento: number;
  valor: number;
  taxaGanho: number;
  taxaPerda: number;
  ratingMedio: number | null;
  investCanal: number | null;
}

interface AtribuicaoData {
  configured: boolean;
  totalLeads: number;
  totalGanhos: number;
  totalPerdidos: number;
  totalAndamento: number;
  totalValor: number;
  investMeta: number;
  investGoogle: number;
  leadsMeta: number;
  leadsGoogle: number;
  metaCrmLeads: number;
  googleCrmLeads: number;
  cplMetaCampanha: number | null;
  cplGoogleCampanha: number | null;
  cplMetaCrm: number | null;
  cplGoogleCrm: number | null;
  porFonte: PorFonte[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrencyBR(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  won:     { label: "Ganho",       cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  lost:    { label: "Perdido",     cls: "bg-red-500/10 text-red-400 border border-red-500/20" },
  ongoing: { label: "Em andamento",cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  paused:  { label: "Pausado",     cls: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[var(--border)]">—</span>;
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-[var(--muted)] text-[var(--muted-foreground)]" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Canal badge ─────────────────────────────────────────────────────────────

const CANAL_CFG: Record<string, { label: string; bg: string }> = {
  META:      { label: "Meta",      bg: "bg-blue-500/10 text-blue-400" },
  GOOGLE:    { label: "Google",    bg: "bg-red-500/10 text-red-400" },
  ORGANICO:  { label: "Orgânico",  bg: "bg-emerald-500/10 text-emerald-400" },
  INDICACAO: { label: "Indicação", bg: "bg-purple-500/10 text-purple-400" },
  DIRETO:    { label: "Direto",    bg: "bg-amber-500/10 text-amber-500" },
  OUTRO:     { label: "Outro",     bg: "bg-[var(--muted)] text-[var(--muted-foreground)]" },
};

function CanalBadge({ canal }: { canal: string }) {
  const cfg = CANAL_CFG[canal] ?? CANAL_CFG.OUTRO;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─── Rating stars ────────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-[var(--border)]">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"}`}
        />
      ))}
    </div>
  );
}

// ─── Mini bar ────────────────────────────────────────────────────────────────

function MiniBar({ won, lost, ongoing }: { won: number; lost: number; ongoing: number }) {
  const total = won + lost + ongoing;
  if (total === 0) return <span className="text-[var(--border)] text-[11px]">—</span>;
  const pWon = (won / total) * 100;
  const pLost = (lost / total) * 100;
  const pOngoing = (ongoing / total) * 100;
  return (
    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-[var(--muted)]">
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pWon}%` }} />
      <div className="h-full bg-red-500 transition-all" style={{ width: `${pLost}%` }} />
      <div className="h-full bg-blue-400/50 transition-all" style={{ width: `${pOngoing}%` }} />
    </div>
  );
}

// ─── Bloco KPI ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-${accent ?? "[var(--primary)]"}/20`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-${accent ?? "[var(--primary)]"} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]`} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${accent ? `text-${accent}` : "text-[var(--foreground)]"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Seção de Atribuição por Canal
// ─────────────────────────────────────────────────────────────────────────────

function AtribuicaoSection({ clienteId }: { clienteId: string }) {
  const [period, setPeriod] = React.useState<"ytd" | "3months" | "all">("ytd");

  const periodDates = React.useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    if (period === "ytd") return { from: `${now.getFullYear()}-01-01`, to };
    if (period === "3months") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().slice(0, 10), to };
    }
    return { from: "2000-01-01", to };
  }, [period]);

  const { data, isLoading } = useQuery<AtribuicaoData>({
    queryKey: ["crm-atribuicao", clienteId, period],
    queryFn: () =>
      fetch(`/api/clientes/${clienteId}/crm/atribuicao?from=${periodDates.from}&to=${periodDates.to}`)
        .then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!data?.configured) return null;

  const fontes = data.porFonte ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
              Atribuição por Canal
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
          {(["ytd", "3months", "all"] as const).map((p) => {
            const label = p === "ytd" ? "Este ano" : p === "3months" ? "3 meses" : "Tudo";
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  period === p
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <>
          {/* KPIs globais */}
          {data.totalLeads > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Total leads CRM</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-[var(--foreground)]">{data.totalLeads}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-emerald-400">{data.totalGanhos} ganhos</span>
                    <span className="text-[var(--border)]">·</span>
                    <span className="text-red-400">{data.totalPerdidos} perdidos</span>
                    <span className="text-[var(--border)]">·</span>
                    <span className="text-[var(--muted-foreground)]">{data.totalAndamento} em aberto</span>
                  </div>
                </div>

                {data.totalValor > 0 && (
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Valor ganho</p>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-400">{formatCurrencyBR(data.totalValor)}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">somente status Ganho</p>
                  </div>
                )}

                {/* CPL real Meta */}
                {data.cplMetaCrm != null && (
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">CPL Real Meta</p>
                    </div>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-blue-400">{formatCurrencyBR(data.cplMetaCrm)}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {formatCurrencyBR(data.investMeta)} ÷ {data.metaCrmLeads} leads CRM
                    </p>
                  </div>
                )}

                {/* CPL real Google */}
                {data.cplGoogleCrm != null && (
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">CPL Real Google</p>
                    </div>
                    <p className="mt-1 text-xl font-extrabold tabular-nums text-red-400">{formatCurrencyBR(data.cplGoogleCrm)}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {formatCurrencyBR(data.investGoogle)} ÷ {data.googleCrmLeads} leads CRM
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legenda da barra de status */}
          {fontes.length > 0 && (
            <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />Ganho</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" />Perdido</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-blue-400/50" />Em andamento</span>
            </div>
          )}

          {/* Tabela por fonte */}
          {fontes.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-[780px] w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    {["Fonte / Origem", "Canal", "Leads", "Status", "% Ganho", "% Perdido", "Valor ganho", "Invest. canal"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {fontes.map((row) => (
                    <tr
                      key={row.fonte}
                      className="group bg-[var(--card)] transition-colors hover:bg-[var(--primary)]/[0.03]"
                    >
                      {/* Fonte */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="block truncate font-medium text-[var(--foreground)]" title={row.fonte}>
                          {row.fonte}
                        </span>
                      </td>

                      {/* Canal */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CanalBadge canal={row.canal} />
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                        {row.leads}
                      </td>

                      {/* Barra de status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MiniBar won={row.ganhos} lost={row.perdidos} ongoing={row.andamento} />
                          <span className="text-[10px] tabular-nums text-[var(--muted-foreground)] whitespace-nowrap">
                            {row.ganhos}/{row.perdidos}/{row.andamento}
                          </span>
                        </div>
                      </td>

                      {/* % Ganho */}
                      <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                        {row.ganhos > 0 ? `${row.taxaGanho}%` : <span className="text-[var(--border)] font-normal">—</span>}
                      </td>

                      {/* % Perdido */}
                      <td className="px-4 py-3 tabular-nums font-semibold text-red-400">
                        {row.perdidos > 0 ? `${row.taxaPerda}%` : <span className="text-[var(--border)] font-normal">—</span>}
                      </td>

                      {/* Valor ganho */}
                      <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                        {row.valor > 0
                          ? formatCurrencyBR(row.valor)
                          : <span className="text-[var(--border)] font-normal">—</span>}
                      </td>

                      {/* Investimento do canal (Meta ou Google) */}
                      <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                        {row.investCanal != null && row.investCanal > 0
                          ? (
                            <span className="text-xs">
                              {formatCurrencyBR(row.investCanal)}
                              <span className="ml-1 text-[10px] opacity-50">(canal)</span>
                            </span>
                          )
                          : <span className="text-[var(--border)]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] py-10 text-sm text-[var(--muted-foreground)]">
              <TrendingUp className="mr-2 h-4 w-4" />
              Nenhum dado de origem disponível — sincronize o CRM para carregar.
            </div>
          )}

          {/* Nota metodológica */}
          {(data.cplMetaCrm != null || data.cplGoogleCrm != null) && (
            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              * <strong>CPL Real</strong> = investimento total do canal ÷ leads CRM com essa origem.
              Diferente do CPL de campanha ({data.cplMetaCampanha != null && `Meta: ${formatCurrencyBR(data.cplMetaCampanha)}`}
              {data.cplMetaCampanha != null && data.cplGoogleCampanha != null && " · "}
              {data.cplGoogleCampanha != null && `Google: ${formatCurrencyBR(data.cplGoogleCampanha)}`}),
              que conta todos os leads registrados na plataforma de anúncios.
              &nbsp;A coluna <strong>Invest. canal</strong> mostra o gasto total do canal — não apenas da fonte específica.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CrmTab principal
// ─────────────────────────────────────────────────────────────────────────────

export function CrmTab({ clienteId }: { clienteId: string }) {
  const [period, setPeriod] = React.useState<Period>("all");
  const queryClient = useQueryClient();

  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: Lead[]; total: number }>({
    queryKey: ["crm-leads", clienteId, period],
    queryFn: () =>
      fetch(`/api/clientes/${clienteId}/crm/leads?period=${period}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/sync`, { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error ?? "Erro ao sincronizar");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funil", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-atribuicao", clienteId] });
    },
  });

  const leads = leadsData?.leads ?? [];
  const isEmpty = !leadsLoading && leads.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
              Negociações & Funil
            </h2>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:text-[var(--primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Sincronizando…" : syncMutation.isSuccess ? "Atualizado ✓" : "Sincronizar"}
        </button>
      </div>

      {syncMutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Erro ao sincronizar. Tente novamente.
        </div>
      )}

      {/* Funil */}
      <FunilCrmSection clienteId={clienteId} />

      {/* Atribuição */}
      <AtribuicaoSection clienteId={clienteId} />

      {/* Negociações */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Negociações</p>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  period === p
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {leadsLoading ? (
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardContent className="flex h-24 items-center justify-center">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
            </CardContent>
          </Card>
        ) : isEmpty ? (
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
                <Inbox className="h-5 w-5 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Nenhuma negociação encontrada</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {period !== "all"
                    ? "Tente ampliar o período ou clique em Sincronizar."
                    : "Clique em Sincronizar para importar as negociações do CRM."}
                </p>
              </div>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] transition-opacity disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Sincronizando…" : "Sincronizar agora"}
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-[1040px] w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  {["Status", "Etapa", "Contato", "Origem", "Qualificação", "Rating", "Entrada", "Fechamento", "Valor"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {leads.map((lead) => {
                  const mkt = lead.dadosMarketing ?? null;
                  return (
                  <tr
                    key={lead.id}
                    className="group bg-[var(--card)] transition-colors hover:bg-[var(--primary)]/[0.03]"
                  >
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Etapa */}
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                        {lead.etapa}
                      </span>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3">
                      {lead.nome ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[var(--foreground)]">{lead.nome}</span>
                          {(lead.email ?? lead.telefone) && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {lead.email ?? lead.telefone}
                            </span>
                          )}
                          {mkt?.empresa && (
                            <span className="text-[10px] text-[var(--muted-foreground)] opacity-70">{mkt.empresa}</span>
                          )}
                        </div>
                      ) : lead.email ?? lead.telefone ? (
                        <span className="text-[var(--muted-foreground)]">{lead.email ?? lead.telefone}</span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>

                    {/* Origem (fonte) */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {lead.fonte ? (
                        <span
                          className="block truncate rounded-md bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                          title={lead.fonte}
                        >
                          {lead.fonte}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>

                    {/* Qualificação (dadosMarketing) */}
                    <td className="px-4 py-3 max-w-[200px]">
                      {mkt ? (
                        <div className="flex flex-col gap-0.5">
                          {mkt.faturamento && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Fat.</span>
                              <span className="truncate text-[var(--foreground)]" title={mkt.faturamento}>{mkt.faturamento}</span>
                            </span>
                          )}
                          {mkt.segmento && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Seg.</span>
                              <span className="truncate text-[var(--foreground)]" title={mkt.segmento}>{mkt.segmento}</span>
                            </span>
                          )}
                          {mkt.investimento && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Inv.</span>
                              <span className="truncate text-[var(--foreground)]" title={mkt.investimento}>{mkt.investimento}</span>
                            </span>
                          )}
                          {mkt.cargo && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Cargo</span>
                              <span className="truncate text-[var(--foreground)]" title={mkt.cargo}>{mkt.cargo}</span>
                            </span>
                          )}
                          {!mkt.faturamento && !mkt.segmento && !mkt.investimento && !mkt.cargo && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">sem dados</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      <RatingStars rating={lead.rating} />
                    </td>

                    {/* Entrada */}
                    <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                      {formatDateBR(lead.dataEntrada)}
                    </td>

                    {/* Fechamento */}
                    <td className="px-4 py-3 tabular-nums">
                      {lead.dataFechamento ? (
                        <span className={`font-medium ${lead.status === "won" ? "text-emerald-500" : lead.status === "lost" ? "text-red-400" : "text-[var(--muted-foreground)]"}`}>
                          {formatDateBR(lead.dataFechamento)}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                      {lead.valor != null
                        ? formatCurrencyBR(lead.valor)
                        : <span className="text-[var(--border)] font-normal">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {leads.length === 500 && (
              <p className="border-t border-[var(--border)] px-4 py-2 text-center text-[11px] text-[var(--muted-foreground)]">
                Mostrando os 500 registros mais recentes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
