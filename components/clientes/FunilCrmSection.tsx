"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, X } from "lucide-react";

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

type MacroGrupo = "Leads" | "Atendimento" | "Visitas" | "Reservas" | "Vendas";
const MACRO_ORDER: MacroGrupo[] = ["Leads", "Atendimento", "Visitas", "Reservas", "Vendas"];

const MACRO_COLORS: Record<MacroGrupo, string> = {
  Leads:       "#6b7280",
  Atendimento: "#3b82f6",
  Visitas:     "#f59e0b",
  Reservas:    "#a855f7",
  Vendas:      "#10b981",
};

export function getMacroGrupo(etapa: string): MacroGrupo | null {
  const e = etapa.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (
    e.includes("perdido") || e.includes("cancelado") || e.includes("descartado") ||
    e.includes("desistiu") || e.includes("sem interesse") || e.includes("inativo")
  ) return null;
  if (e.includes("venda") || e.includes("contrato") || e.includes("assinado")) return "Vendas";
  if (e.includes("reserva")) return "Reservas";
  if (e.includes("visita") || e.includes("reagendar")) return "Visitas";
  if (
    e.includes("atendimento") || e.includes("simulacao") ||
    e.includes("proposta") || e.includes("qualificacao")
  ) return "Atendimento";
  return "Leads";
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
  onEtapaFilter,
}: {
  clienteId: string;
  dateRange: { from: string; to: string };
  leadFilter?: LeadFilter;
  onEtapaFilter?: (filter: LeadFilter) => void;
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

  const activeEtapa = leadFilter?.type === "etapa" ? leadFilter.value : null;

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

  // Aggregate into macro-groups and collect sub-etapas per group
  const macroMap = new Map<MacroGrupo, { count: number; ganhos: number; subEtapas: EtapaFunil[] }>();
  for (const grupo of MACRO_ORDER) macroMap.set(grupo, { count: 0, ganhos: 0, subEtapas: [] });
  let leadsExcluidos = 0;
  for (const e of etapas) {
    const g = getMacroGrupo(e.etapa);
    if (g === null) { leadsExcluidos += e.count; continue; }
    const b = macroMap.get(g)!;
    b.count += e.count;
    b.ganhos += e.ganhos;
    b.subEtapas.push(e);
  }

  const macroGroups = MACRO_ORDER
    .map((g) => ({ grupo: g, ...macroMap.get(g)! }))
    .filter((g) => g.count > 0);

  const maxCount = Math.max(...macroGroups.map((g) => g.count), 1);

  const taxaFechamento = totalLeads > 0
    ? ((data.totalGanhos / totalLeads) * 100).toFixed(1)
    : "0.0";

  function handleGrupoClick(grupo: MacroGrupo) {
    if (!onEtapaFilter) return;
    if (activeEtapa === grupo) {
      onEtapaFilter(null);
    } else {
      onEtapaFilter({ type: "etapa", value: grupo, label: grupo });
    }
  }

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

        {/* Hint when clickable */}
        {onEtapaFilter && macroGroups.length > 0 && (
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Clique em uma etapa para filtrar os leads abaixo
          </p>
        )}

        {/* Macro-group funnel — clickable */}
        {macroGroups.length > 0 && (
          <div className="space-y-2">
            {macroGroups.map((grupo) => {
              const pct = maxCount > 0 ? (grupo.count / maxCount) * 100 : 0;
              const pctTotal = totalLeads > 0 ? ((grupo.count / totalLeads) * 100) : 0;
              const color = MACRO_COLORS[grupo.grupo];
              const isActive = activeEtapa === grupo.grupo;
              const isClickable = !!onEtapaFilter;

              // Sort sub-etapas descending by count
              const subs = [...grupo.subEtapas].sort((a, b) => b.count - a.count);

              return (
                <div
                  key={grupo.grupo}
                  onClick={() => isClickable && handleGrupoClick(grupo.grupo)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => { if (isClickable && (e.key === "Enter" || e.key === " ")) handleGrupoClick(grupo.grupo); }}
                  className={[
                    "group relative overflow-hidden rounded-xl border p-3 transition-all",
                    isClickable ? "cursor-pointer select-none" : "",
                    isActive
                      ? "border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[var(--card)]"
                      : "border-[var(--border)] bg-[var(--card)]",
                    isClickable && !isActive ? "hover:border-[var(--border)] hover:bg-[var(--muted)]/10" : "",
                  ].join(" ")}
                  style={isActive ? { borderColor: `${color}50` } : undefined}
                >
                  {/* Background fill bar */}
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: isActive ? 0.14 : 0.07,
                    }}
                  />

                  <div className="relative space-y-2">
                    {/* Main row */}
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {grupo.grupo}
                        </p>
                        {isActive && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            filtrado
                            <X className="ml-0.5 h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                        {pctTotal < 1 ? pctTotal.toFixed(1) : Math.round(pctTotal)}% do total
                      </span>
                      <span
                        className="w-14 shrink-0 text-right text-sm font-bold tabular-nums"
                        style={{ color }}
                      >
                        {grupo.count.toLocaleString("pt-BR")}
                      </span>
                    </div>

                    {/* Sub-etapas */}
                    {subs.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 pl-4">
                        {subs.map((s) => (
                          <span
                            key={s.etapa}
                            className="rounded-full border px-2 py-0.5 text-[10px] tabular-nums text-[var(--muted-foreground)]"
                            style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
                          >
                            {s.etapa}
                            <span className="ml-1 font-semibold" style={{ color }}>
                              {s.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {leadsExcluidos > 0 && (
              <p className="pt-1 text-[10px] text-[var(--muted-foreground)]">
                + {leadsExcluidos.toLocaleString("pt-BR")} leads perdidos / cancelados (não exibidos no funil)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
