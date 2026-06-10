"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FunilCrmSection } from "@/components/clientes/FunilCrmSection";
import { RefreshCw, Inbox } from "lucide-react";

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
}

function formatCurrencyBR(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

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
    },
  });

  const leads = leadsData?.leads ?? [];
  const isEmpty = !leadsLoading && leads.length === 0;

  return (
    <div className="space-y-6">
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
            <table className="min-w-[600px] w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  {["Etapa", "Contato", "Entrada", "Fechamento", "Valor"].map((h) => (
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
