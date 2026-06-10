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
}

interface PorFonte {
  fonte: string;
  canal: "META" | "GOOGLE" | "ORGANICO" | "OUTRO";
  leads: number;
  fechados: number;
  valor: number;
  taxaFechamento: number;
  ratingMedio: number | null;
  investCanal: number | null;
}

interface AtribuicaoData {
  configured: boolean;
  totalLeads: number;
  totalFechados: number;
  totalValor: number;
  investMeta: number;
  investGoogle: number;
  leadsMeta: number;
  leadsGoogle: number;
  porFonte: PorFonte[];
}

function formatCurrencyBR(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

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

const CANAL_BADGE: Record<string, { bg: string; label: string }> = {
  META: { bg: "bg-blue-500/10 text-blue-400", label: "Meta" },
  GOOGLE: { bg: "bg-red-500/10 text-red-400", label: "Google" },
  ORGANICO: { bg: "bg-emerald-500/10 text-emerald-400", label: "Orgânico" },
  OUTRO: { bg: "bg-[var(--muted)] text-[var(--muted-foreground)]", label: "Outro" },
};

function CanalBadge({ canal }: { canal: string }) {
  const cfg = CANAL_BADGE[canal] ?? CANAL_BADGE.OUTRO;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloco de atribuição por canal/fonte
// ─────────────────────────────────────────────────────────────────────────────
function AtribuicaoSection({ clienteId }: { clienteId: string }) {
  const [period, setPeriod] = React.useState<"ytd" | "3months" | "all">("ytd");

  const periodDates = React.useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    if (period === "ytd") {
      return { from: `${now.getFullYear()}-01-01`, to };
    }
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
      fetch(
        `/api/clientes/${clienteId}/crm/atribuicao?from=${periodDates.from}&to=${periodDates.to}`,
      ).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!data?.configured) return null;

  const fontes = data.porFonte ?? [];
  const totalLeads = data.totalLeads ?? 0;

  // KPIs de topo
  const cplMeta =
    data.investMeta > 0 && data.leadsMeta > 0
      ? data.investMeta / data.leadsMeta
      : null;
  const cplGoogle =
    data.investGoogle > 0 && data.leadsGoogle > 0
      ? data.investGoogle / data.leadsGoogle
      : null;

  const metaFonteLeads = fontes.filter((f) => f.canal === "META").reduce((s, f) => s + f.leads, 0);
  const googleFonteLeads = fontes.filter((f) => f.canal === "GOOGLE").reduce((s, f) => s + f.leads, 0);

  const cplMetaCrm =
    data.investMeta > 0 && metaFonteLeads > 0
      ? data.investMeta / metaFonteLeads
      : null;
  const cplGoogleCrm =
    data.investGoogle > 0 && googleFonteLeads > 0
      ? data.investGoogle / googleFonteLeads
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              CRM
            </p>
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
          {/* KPI cards — cruzamento ads vs CRM */}
          {(cplMetaCrm != null || cplGoogleCrm != null) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Investimento Meta */}
              {data.investMeta > 0 && (
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-blue-500/20">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Invest. Meta
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-[var(--foreground)]">
                    {formatCurrencyBR(data.investMeta)}
                  </p>
                  {metaFonteLeads > 0 && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {metaFonteLeads} leads CRM
                    </p>
                  )}
                </div>
              )}
              {/* CPL real Meta (invest / leads CRM atribuídos a Meta) */}
              {cplMetaCrm != null && (
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-blue-500/20">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    CPL Real Meta
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-blue-400">
                    {formatCurrencyBR(cplMetaCrm)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">invest ÷ leads CRM</p>
                </div>
              )}
              {/* Investimento Google */}
              {data.investGoogle > 0 && (
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-red-500/20">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Invest. Google
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-[var(--foreground)]">
                    {formatCurrencyBR(data.investGoogle)}
                  </p>
                  {googleFonteLeads > 0 && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {googleFonteLeads} leads CRM
                    </p>
                  )}
                </div>
              )}
              {/* CPL real Google */}
              {cplGoogleCrm != null && (
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-red-500/20">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    CPL Real Google
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-red-400">
                    {formatCurrencyBR(cplGoogleCrm)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">invest ÷ leads CRM</p>
                </div>
              )}
            </div>
          )}

          {/* Tabela por fonte */}
          {fontes.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    {["Fonte", "Canal", "Leads", "Fechados", "% Fechamento", "Valor", "Rating médio"].map((h) => (
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
                  {fontes.map((row) => {
                    const pct = totalLeads > 0 ? (row.leads / totalLeads) * 100 : 0;
                    return (
                      <tr
                        key={row.fonte}
                        className="group bg-[var(--card)] transition-colors hover:bg-[var(--primary)]/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 rounded-full bg-[var(--primary)] opacity-80 transition-all"
                              style={{ width: `${Math.max(pct, 2)}%`, maxWidth: "60px" }}
                            />
                            <span className="font-medium text-[var(--foreground)] leading-tight">
                              {row.fonte}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <CanalBadge canal={row.canal} />
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                          {row.leads}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-emerald-500 font-semibold">
                          {row.fechados > 0 ? row.fechados : <span className="text-[var(--border)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--muted)]">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${row.taxaFechamento}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-[var(--muted-foreground)]">
                              {row.taxaFechamento}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                          {row.valor > 0 ? formatCurrencyBR(row.valor) : <span className="text-[var(--border)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.ratingMedio != null ? (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400" />
                              {row.ratingMedio.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[var(--border)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] py-10 text-sm text-[var(--muted-foreground)]">
              <TrendingUp className="mr-2 h-4 w-4" />
              Nenhum dado de fonte disponível — sincronize o CRM para carregar.
            </div>
          )}

          {/* Nota metodológica */}
          {(cplMetaCrm != null || cplGoogleCrm != null) && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              * CPL Real = investimento total do canal ÷ leads CRM atribuídos a esse canal via campo "Fonte" do RD Station.
              {cplMeta != null && (
                <> CPL de campanha (Meta) = {formatCurrencyBR(cplMeta)}.</>
              )}
              {cplGoogle != null && (
                <> CPL de campanha (Google) = {formatCurrencyBR(cplGoogle)}.</>
              )}
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              CRM
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
              Negociações & Funil
            </h2>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:text-[var(--primary)] disabled:opacity-50"
          title="Atualiza anúncios, leads e CRM"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Sincronizando…" : syncMutation.isSuccess ? "Atualizado ✓" : "Sincronizar"}
        </button>
      </div>

      {/* Sync error banner */}
      {syncMutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Erro ao sincronizar. Tente novamente.
        </div>
      )}

      {/* Funil */}
      <FunilCrmSection clienteId={clienteId} />

      {/* Atribuição por canal */}
      <AtribuicaoSection clienteId={clienteId} />

      {/* Negociações list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Negociações recentes</p>
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
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Nenhuma negociação encontrada
                </p>
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
            <table className="min-w-[750px] w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  {["Etapa", "Contato", "Fonte", "Rating", "Entrada", "Fechamento", "Valor"].map((h) => (
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
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="group bg-[var(--card)] transition-colors hover:bg-[var(--primary)]/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                        {lead.etapa}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.nome ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[var(--foreground)]">{lead.nome}</span>
                          {(lead.email ?? lead.telefone) && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              {lead.email ?? lead.telefone}
                            </span>
                          )}
                        </div>
                      ) : lead.email ?? lead.telefone ? (
                        <span className="text-[var(--muted-foreground)]">
                          {lead.email ?? lead.telefone}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.fonte ? (
                        <span className="inline-block max-w-[140px] truncate rounded-md bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]" title={lead.fonte}>
                          {lead.fonte}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RatingStars rating={lead.rating} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                      {formatDateBR(lead.dataEntrada)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                      {lead.dataFechamento ? (
                        <span className="font-medium text-emerald-500">
                          {formatDateBR(lead.dataFechamento)}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                      {lead.valor != null ? formatCurrencyBR(lead.valor) : <span className="text-[var(--border)]">—</span>}
                    </td>
                  </tr>
                ))}
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
