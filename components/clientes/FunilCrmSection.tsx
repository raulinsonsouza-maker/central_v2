"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface EtapaFunil {
  etapa: string;
  count: number;
  valor: number;
  fechados: number;
  ganhos: number;
  pctTotal: number;
}

interface FunilData {
  configured: boolean;
  tipo?: string;
  ultimoSyncAt?: string | null;
  totalLeads: number;
  totalValor: number;
  totalFechados: number;
  totalGanhos: number;
  etapas: EtapaFunil[];
}

const CRM_LABELS: Record<string, string> = {
  CVCRM: "CV CRM",
  RDSTATION_CRM: "RD Station CRM",
  KOMMO: "Kommo",
};

type MacroGrupo = "Leads" | "Atendimento" | "Visitas" | "Reservas" | "Vendas" | "Perdidos";
const MACRO_ORDER: MacroGrupo[] = ["Leads", "Atendimento", "Visitas", "Reservas", "Vendas", "Perdidos"];

const MACRO_COLORS: Record<MacroGrupo, string> = {
  Leads:       "#6b7280",
  Atendimento: "#3b82f6",
  Visitas:     "#f59e0b",
  Reservas:    "#a855f7",
  Vendas:      "#10b981",
  Perdidos:    "#ef4444",
};

function getMacroGrupo(etapa: string): MacroGrupo {
  const e = etapa.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Terminal loss / inactive stages
  if (
    e.includes("perdido") || e.includes("cancelado") || e.includes("descartado") ||
    e.includes("desistiu") || e.includes("desistencia") || e.includes("sem interesse") ||
    e.includes("inativo") || e.includes("invalido") || e.includes("duplicado")
  ) return "Perdidos";
  if (e.includes("venda") || e.includes("contrato") || e.includes("assinado")) return "Vendas";
  if (e.includes("reserva")) return "Reservas";
  if (e.includes("visita") || e.includes("reagendar")) return "Visitas";
  if (
    e.includes("atendimento") || e.includes("simulacao") ||
    e.includes("proposta") || e.includes("qualificacao") || e.includes("negociac")
  ) return "Atendimento";
  return "Leads";
}

function fmtValor(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

type LeadFilter = { type: string; value: string; label: string } | null;

export function FunilCrmSection({
  clienteId,
  dateRange,
  leadFilter,
}: {
  clienteId: string;
  dateRange: { from: string; to: string };
  leadFilter?: LeadFilter;
}) {
  const filterQs = leadFilter
    ? `&filterType=${encodeURIComponent(leadFilter.type)}&filterValue=${encodeURIComponent(leadFilter.value)}`
    : "";

  const { data, isLoading } = useQuery<FunilData>({
    queryKey: ["crm-funil", clienteId, dateRange.from, dateRange.to, leadFilter?.type, leadFilter?.value],
    queryFn: () =>
      fetch(
        `/api/clientes/${clienteId}/crm/funil?from=${dateRange.from}&to=${dateRange.to}${filterQs}`
      ).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
        <CardContent className="flex h-24 items-center justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.configured) return null;

  const etapas = data.etapas ?? [];
  const totalLeads = data.totalLeads;

  // Group the detailed CRM stages under their macro-group, preserving the
  // API ordering (by ordemEtapa) within each group.
  const grouped = MACRO_ORDER.map((grupo) => {
    const grupoEtapas = etapas.filter((e) => getMacroGrupo(e.etapa) === grupo);
    const count = grupoEtapas.reduce((s, e) => s + e.count, 0);
    const valor = grupoEtapas.reduce((s, e) => s + e.valor, 0);
    return { grupo, etapas: grupoEtapas, count, valor };
  }).filter((g) => g.etapas.length > 0);

  // Bar scale is relative to the busiest single stage.
  const maxCount = Math.max(...etapas.map((e) => e.count), 1);

  const taxaFechamento = totalLeads > 0
    ? ((data.totalGanhos / totalLeads) * 100).toFixed(1)
    : "0.0";

  return (
    <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                {CRM_LABELS[data.tipo ?? ""] ?? data.tipo}
              </p>
              <CardTitle className="mt-0">Funil CRM</CardTitle>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {data.ultimoSyncAt && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                Sync {formatRelativeTime(data.ultimoSyncAt)}
              </span>
            )}
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {taxaFechamento}% conversão geral
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 divide-x divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 sm:grid-cols-3">
          <div className="px-4 py-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Leads no período</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--foreground)]">
              {totalLeads.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Fechamentos</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-emerald-400">
              {data.totalGanhos.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="hidden px-4 py-3 text-center sm:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Taxa de fechamento</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--primary)]">
              {taxaFechamento}%
            </p>
          </div>
        </div>

        {/* Detailed stage funnel, grouped by macro-stage */}
        {grouped.length > 0 && (
          <div className="space-y-4">
            {grouped.map((grupo) => {
              const color = MACRO_COLORS[grupo.grupo];
              const pctGrupo = totalLeads > 0 ? (grupo.count / totalLeads) * 100 : 0;
              return (
                <div key={grupo.grupo} className="space-y-1.5">
                  {/* Group header */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color }}
                    >
                      {grupo.grupo}
                    </p>
                    <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]">
                      {grupo.count.toLocaleString("pt-BR")} {grupo.count === 1 ? "lead" : "leads"}
                      {" · "}
                      {pctGrupo < 1 ? pctGrupo.toFixed(1) : Math.round(pctGrupo)}%
                    </span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>

                  {/* Detailed stages within the group */}
                  <div className="space-y-1">
                    {grupo.etapas.map((e) => {
                      const pct = maxCount > 0 ? (e.count / maxCount) * 100 : 0;
                      const pctTotal = totalLeads > 0 ? (e.count / totalLeads) * 100 : 0;
                      return (
                        <div
                          key={e.etapa}
                          className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                        >
                          {/* Background fill bar */}
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.08] transition-all group-hover:opacity-[0.14]"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                          <div className="relative flex items-center gap-3">
                            {/* Stage name */}
                            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--foreground)]">
                              {e.etapa}
                            </p>
                            {/* Total value */}
                            {e.valor > 0 && (
                              <span className="hidden shrink-0 text-[10px] tabular-nums text-[var(--muted-foreground)] sm:inline">
                                {fmtValor(e.valor)}
                              </span>
                            )}
                            {/* % do total */}
                            <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                              {pctTotal < 1 ? pctTotal.toFixed(1) : Math.round(pctTotal)}%
                            </span>
                            {/* Count */}
                            <span
                              className="w-12 shrink-0 text-right text-sm font-bold tabular-nums"
                              style={{ color }}
                            >
                              {e.count.toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
