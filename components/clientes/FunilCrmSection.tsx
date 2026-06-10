"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ArrowDown } from "lucide-react";

interface EtapaFunil {
  etapa: string;
  count: number;
  valor: number;
  fechados: number;
  conversionFromPrev: number | null;
}

interface FunilData {
  configured: boolean;
  tipo?: string;
  ultimoSyncAt?: string | null;
  totalLeads: number;
  totalValor: number;
  totalFechados: number;
  overallConversion: number | null;
  etapas: EtapaFunil[];
}

const CRM_LABELS: Record<string, string> = {
  CVCRM: "CV CRM",
  RDSTATION_CRM: "RD Station CRM",
  KOMMO: "Kommo",
};

function formatCurrencyBR(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function FunilCrmSection({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useQuery<FunilData>({
    queryKey: ["crm-funil", clienteId],
    queryFn: () =>
      fetch(`/api/clientes/${clienteId}/crm/funil`).then((r) => r.json()),
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

  const maxCount = Math.max(...(data.etapas ?? []).map((e) => e.count), 1);

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
            {data.overallConversion != null && (
              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                {data.overallConversion}% conversão geral
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
          {[
            { label: "LEADS TOTAIS", value: data.totalLeads.toLocaleString("pt-BR") },
            { label: "FECHADOS", value: data.totalFechados.toLocaleString("pt-BR") },
            { label: "VALOR TOTAL", value: data.totalValor > 0 ? formatCurrencyBR(data.totalValor) : "—" },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--foreground)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {data.etapas && data.etapas.length > 0 && (
          <div className="space-y-1">
            {data.etapas.map((etapa, idx) => {
              const pct = maxCount > 0 ? (etapa.count / maxCount) * 100 : 0;
              return (
                <React.Fragment key={etapa.etapa}>
                  {idx > 0 && etapa.conversionFromPrev != null && (
                    <div className="flex items-center gap-2 px-3 py-0.5">
                      <ArrowDown className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
                      <span className="text-[10px] font-semibold tabular-nums text-[var(--muted-foreground)]">
                        {etapa.conversionFromPrev}% de conversão
                      </span>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                  )}
                  <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 transition-all hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]">
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-[var(--primary)] opacity-[0.06] transition-all group-hover:opacity-[0.10]"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {etapa.etapa}
                        </p>
                        {etapa.valor > 0 && (
                          <p className="text-[11px] text-[var(--muted-foreground)]">
                            {formatCurrencyBR(etapa.valor)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {etapa.fechados > 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            {etapa.fechados} fechado{etapa.fechados !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="min-w-[2rem] text-right text-sm font-bold tabular-nums text-[var(--foreground)]">
                          {etapa.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
