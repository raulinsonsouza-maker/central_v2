"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  type TooltipProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  Globe,
  Landmark,
  MessageSquareMore,
  ReceiptText,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type PainelResumo = {
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  onFacebookLeads: number;
  websiteLeads: number;
  messagingConversationsStarted: number;
  contacts: number;
  purchases: number;
  faturamento: number;
  cpl: number;
  cpa: number;
  roas: number;
  ticketMedio: number;
  ctr: number;
  taxaVendaLead: number;
  taxaVendaClique: number;
};

type PainelSerie = {
  periodo: string;
  investimento: number;
  leads: number;
  purchases: number;
  faturamento: number;
  cpl: number;
  cpa: number;
  roas: number;
  ticketMedio: number;
};

type CampanhaCPV = {
  nome: string;
  investimento: number;
  vendas: number;
  faturamento: number;
  custoporVenda: number;
  ticketMedio: number;
};

type PainelData = {
  periodo: string;
  resumo: PainelResumo;
  series: PainelSerie[];
  campanhas: CampanhaCPV[];
  leadMix: {
    onFacebookLeads: number;
    websiteLeads: number;
    messagingConversationsStarted: number;
    contacts: number;
  };
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatInteger(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function ResortChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const chartPoint = payload[0]?.payload as
    | {
        Investimento?: number;
        Faturamento?: number;
        Vendas?: number;
      }
    | undefined;

  return (
    <div
      className="rounded-[14px] border px-4 py-3"
      style={{
        background: "linear-gradient(180deg, rgba(22,22,28,0.98), rgba(14,14,18,0.98))",
        borderColor: "rgba(255, 106, 0, 0.18)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.38)",
      }}
    >
      <p className="mb-2 text-sm font-extrabold text-[#f5f5f5]">{label}</p>
      <div className="space-y-2 text-[13px]">
        <div className="flex items-center justify-between gap-5">
          <span className="font-semibold text-[#ff7f1f]">Faturamento</span>
          <span className="font-extrabold text-[#ff7f1f]">
            {formatCurrency(Number(chartPoint?.Faturamento ?? 0))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="font-medium text-[var(--foreground)]/80">Investimento</span>
          <span className="font-semibold text-[var(--foreground)]">
            {formatCurrency(Number(chartPoint?.Investimento ?? 0))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="font-medium text-[var(--foreground)]/80">Vendas</span>
          <span className="font-semibold text-[var(--foreground)]">
            {formatInteger(Number(chartPoint?.Vendas ?? 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

function ResortKpi({
  title,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-[var(--border)] bg-[var(--card)]">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {title}
          </p>
          <p
            className={`mt-1 text-2xl font-extrabold leading-none tabular-nums ${
              accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"
            }`}
          >
            {value}
          </p>
          <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function HotelFazendaSaoJoaoPanel({
  data,
  canalLabel,
}: {
  data: PainelData;
  canalLabel: string;
}) {
  const latestFiveSeries = data.series.slice(-5);
  const receitaPorLead = data.resumo.leads > 0 ? data.resumo.faturamento / data.resumo.leads : 0;
  const chartData = data.series.map((item) => ({
    periodo: item.periodo,
    Investimento: Number(item.investimento.toFixed(2)),
    Faturamento: Number(item.faturamento.toFixed(2)),
    Vendas: item.purchases,
  }));
  const topFaturamentoWeek = [...data.series].sort((a, b) => b.faturamento - a.faturamento)[0];
  const topRoasWeek = [...data.series].sort((a, b) => b.roas - a.roas)[0];
  const topSalesWeek = [...data.series].sort((a, b) => b.purchases - a.purchases)[0];

  const leadMixCards = [
    {
      label: "Leads via site",
      value: formatInteger(data.leadMix.websiteLeads),
      icon: Globe,
    },
    {
      label: "Leads on-Facebook",
      value: formatInteger(data.leadMix.onFacebookLeads),
      icon: Users,
    },
    {
      label: "Conversas iniciadas",
      value: formatInteger(data.leadMix.messagingConversationsStarted),
      icon: MessageSquareMore,
    },
    {
      label: "Receita por lead",
      value: formatCurrency(receitaPorLead),
      icon: BadgeDollarSign,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ResortKpi
          title="Faturamento"
          value={formatCurrency(data.resumo.faturamento)}
          sub={`${data.periodo} selecionados`}
          icon={BadgeDollarSign}
          accent
        />
        <ResortKpi
          title="Investimento"
          value={formatCurrency(data.resumo.investimento)}
          sub="Mídia total no período"
          icon={Landmark}
        />
        <ResortKpi
          title="Vendas"
          value={formatInteger(data.resumo.purchases)}
          sub={`Canal ${canalLabel}`}
          icon={ShoppingCart}
        />
        <ResortKpi
          title="ROAS"
          value={`${data.resumo.roas.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}x`}
          sub="Receita por real investido"
          icon={TrendingUp}
        />
        <ResortKpi
          title="Custo por venda"
          value={formatCurrency(data.resumo.cpa)}
          sub="Eficiência comercial"
          icon={Target}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                  Performance comercial
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Comparativo semanal entre investimento e faturamento, com destaques comerciais.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <ReceiptText className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                <span className="h-2 w-2 rounded-full bg-[rgba(255,106,0,0.45)]" />
                Investimento
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                Faturamento
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1 text-[11px] font-medium text-[var(--foreground)]">
                {formatInteger(data.resumo.purchases)} vendas no período
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.45} />
                  <XAxis
                    dataKey="periodo"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="money"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`}
                  />
                  <Tooltip content={<ResortChartTooltip />} />
                  <Bar
                    yAxisId="money"
                    dataKey="Investimento"
                    fill="rgba(255, 106, 0, 0.42)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="money"
                    type="monotone"
                    dataKey="Faturamento"
                    stroke="#ff7f1f"
                    strokeWidth={3.2}
                    dot={{ fill: "#ff7f1f", r: 4.5, strokeWidth: 0 }}
                    activeDot={{
                      r: 6,
                      fill: "#ff7f1f",
                      stroke: "rgba(255,255,255,0.16)",
                      strokeWidth: 2,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Maior faturamento semanal
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {topFaturamentoWeek ? formatCurrency(topFaturamentoWeek.faturamento) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {topFaturamentoWeek?.periodo ?? "Sem dados"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Melhor ROAS semanal
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {topRoasWeek
                    ? `${topRoasWeek.roas.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}x`
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {topRoasWeek?.periodo ?? "Sem dados"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Pico de vendas semanais
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {topSalesWeek ? formatInteger(topSalesWeek.purchases) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {topSalesWeek?.periodo ?? "Sem dados"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                  Leitura de receita
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Indicadores comerciais para análise executiva do resort.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Ticket médio
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {formatCurrency(data.resumo.ticketMedio)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Taxa lead para venda
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {formatPercentage(data.resumo.taxaVendaLead)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Taxa clique para venda
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {formatPercentage(data.resumo.taxaVendaClique)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                CTR do período
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {formatPercentage(data.resumo.ctr)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {leadMixCards.map((item) => (
          <Card key={item.label} className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {latestFiveSeries.length > 0 && (
        <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
          <CardHeader className="border-b border-[var(--border)]/60 px-6 pb-5 pt-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-2xl">
                  Resultado comercial
                  <span className="ml-2 bg-[linear-gradient(90deg,var(--accent),var(--primary))] bg-clip-text text-transparent">
                    Semana a semana
                  </span>
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Foco em receita, vendas e eficiência para o resort.
                </p>
              </div>
              <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--foreground)]">
                {latestFiveSeries.length} semanas
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate [border-spacing:0_10px]">
                <thead>
                  <tr>
                    <th className="w-[220px] px-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                      Métrica
                    </th>
                    {latestFiveSeries.map((item, index) => {
                      const isLatest = index === latestFiveSeries.length - 1;
                      return (
                        <th
                          key={item.periodo}
                          className={`px-4 text-center ${
                            isLatest ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                                isLatest ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                              }`}
                            >
                              {isLatest ? "Atual" : "Semana"}
                            </span>
                            <span className="text-sm font-semibold whitespace-nowrap">{item.periodo}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Investimento", render: (item: PainelSerie) => formatCurrency(item.investimento) },
                    { label: "Leads", render: (item: PainelSerie) => formatInteger(item.leads) },
                    { label: "Vendas", render: (item: PainelSerie) => formatInteger(item.purchases) },
                    { label: "Faturamento", render: (item: PainelSerie) => formatCurrency(item.faturamento) },
                    {
                      label: "ROAS",
                      render: (item: PainelSerie) =>
                        `${item.roas.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}x`,
                    },
                    { label: "CPL", render: (item: PainelSerie) => formatCurrency(item.cpl) },
                    { label: "Custo por venda", render: (item: PainelSerie) => formatCurrency(item.cpa) },
                    { label: "Ticket médio", render: (item: PainelSerie) => formatCurrency(item.ticketMedio) },
                  ].map((metric, metricIdx) => (
                    <tr key={metric.label}>
                      <td className="rounded-l-2xl bg-white/[0.03] px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
                          {metric.label}
                        </p>
                      </td>
                      {latestFiveSeries.map((item, index) => {
                        const isLatest = index === latestFiveSeries.length - 1;
                        return (
                          <td
                            key={`${metric.label}-${item.periodo}`}
                            className={`px-4 py-4 text-center ${
                              isLatest
                                ? "bg-[linear-gradient(180deg,rgba(255,106,0,0.12),rgba(255,106,0,0.05))]"
                                : metricIdx % 2 === 0
                                  ? "bg-white/[0.03]"
                                  : "bg-white/[0.015]"
                            }`}
                          >
                            <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">
                              {metric.render(item)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </section>
  );
}
