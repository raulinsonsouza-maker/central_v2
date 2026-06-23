"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, Heart, Eye, TrendingUp, Instagram, ImageIcon } from "lucide-react";

interface SocialMediaData {
  configured: boolean;
  error?: string;
  profile?: { nome: string; followersTotal: number };
  period?: {
    alcanceTotal: number;
    engajamentoTotal: number;
    novosSeguidores: number;
    taxaEngajamento: number;
  };
  monthly?: Array<{
    mes: string;
    label: string;
    alcance: number;
    engajamento: number;
    novosSeguidores: number;
  }>;
  topPosts?: Array<{
    id: string;
    caption: string;
    thumbnailUrl: string | null;
    timestamp: string;
    alcance: number;
    curtidas: number;
    comentarios: number;
    salvos: number;
    compartilhamentos: number;
    taxaEngajamento: number;
  }>;
}

interface Props {
  clienteId: string;
  dateFilter: { dataInicio?: string | null; dataFim?: string | null };
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtPct(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
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

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
      <div className="mb-2 flex items-center gap-2 text-[var(--primary)]">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  valueLabel: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-[var(--foreground)]">{label}</p>
      <p className="text-[var(--primary)]">
        {valueLabel}: <span className="font-bold">{fmt(payload[0].value)}</span>
      </p>
    </div>
  );
};

function MiniChart({
  data,
  dataKey,
  title,
  sub,
  valueLabel,
  color = "var(--primary)",
}: {
  data: SocialMediaData["monthly"];
  dataKey: string;
  title: string;
  sub: string;
  valueLabel: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{sub}</p>
      <p className="mb-4 text-base font-bold text-[var(--foreground)]">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            content={<CustomTooltip valueLabel={valueLabel} />}
            cursor={{ fill: "var(--primary)", fillOpacity: 0.06 }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-2xl bg-[var(--muted)]/40" />;
}

export function SocialMediaPanel({ clienteId, dateFilter }: Props) {
  const params = new URLSearchParams();
  if (dateFilter.dataInicio) params.set("dataInicio", dateFilter.dataInicio);
  if (dateFilter.dataFim) params.set("dataFim", dateFilter.dataFim);

  const { data, isLoading, error } = useQuery<SocialMediaData>({
    queryKey: ["social-media", clienteId, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/social-media?${params}`);
      if (!r.ok) throw new Error("Erro ao carregar dados de Social Media");
      return r.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-[var(--muted)]/40" />)}
        </div>
      </div>
    );
  }

  if (error || data?.error) {
    const msg = data?.error ?? (error instanceof Error ? error.message : "Erro desconhecido");
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/6 px-6 py-10 text-center">
        <p className="text-sm font-medium text-red-400">{msg}</p>
        <p className="mt-1 text-xs text-red-400/60">Verifique se o token Meta tem permissões de Instagram Insights.</p>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
        <Instagram className="mb-4 h-10 w-10 text-[var(--muted-foreground)]/40" />
        <p className="text-base font-semibold text-[var(--foreground)]">Instagram não configurado</p>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
          Adicione o <strong>Instagram Business Account ID</strong> no cadastro deste cliente (Administração → editar cliente → seção Meta Ads).
        </p>
      </div>
    );
  }

  const { profile, period, monthly, topPosts } = data;

  return (
    <div className="space-y-10">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Seguidores"
          value={fmt(profile?.followersTotal ?? 0)}
          sub="Total atual"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Novos seguidores"
          value={fmt(period?.novosSeguidores ?? 0)}
          sub="No período (12 meses)"
        />
        <KpiCard
          icon={<Heart className="h-4 w-4" />}
          label="Taxa de engajamento"
          value={fmtPct(period?.taxaEngajamento ?? 0)}
          sub="Interações / alcance"
        />
        <KpiCard
          icon={<Eye className="h-4 w-4" />}
          label="Alcance total"
          value={fmt(period?.alcanceTotal ?? 0)}
          sub="Últimos 12 meses"
        />
      </div>

      {/* ── Monthly charts ── */}
      <div>
        <SectionHeader sub="Evolução mensal" title="Performance orgânica" />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MiniChart
            data={monthly}
            dataKey="engajamento"
            title="Engajamento total"
            sub="Interações"
            valueLabel="Interações"
          />
          <MiniChart
            data={monthly}
            dataKey="alcance"
            title="Alcance das publicações"
            sub="Alcance"
            valueLabel="Alcance"
            color="#f97316"
          />
          <MiniChart
            data={monthly}
            dataKey="novosSeguidores"
            title="Ganho de seguidores"
            sub="Seguidores"
            valueLabel="Novos seguidores"
            color="#fb923c"
          />
        </div>
      </div>

      {/* ── Top posts ── */}
      {topPosts && topPosts.length > 0 && (
        <div>
          <SectionHeader sub="Orgânico" title="Melhores posts" />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Publicação</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Alcance</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Curtidas</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Comentários</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">Taxa Eng.</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Salvos</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Compart.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topPosts.map((post, idx) => (
                  <tr
                    key={post.id}
                    className={`transition-colors hover:bg-[var(--muted)]/20 ${idx % 2 === 0 ? "" : "bg-[var(--muted)]/5"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]/40">
                          {post.thumbnailUrl ? (
                            <img
                              src={post.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-[var(--muted-foreground)]/40" />
                            </div>
                          )}
                        </div>
                        <p className="max-w-[200px] truncate text-xs text-[var(--foreground)]" title={post.caption}>
                          {post.caption || <span className="text-[var(--muted-foreground)]">(sem legenda)</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--foreground)]">{fmt(post.alcance)}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--foreground)]">{fmt(post.curtidas)}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--foreground)]">{fmt(post.comentarios)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--primary)]">
                        {fmtPct(post.taxaEngajamento)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--foreground)]">{fmt(post.salvos)}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--foreground)]">{fmt(post.compartilhamentos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topPosts && topPosts.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhuma publicação encontrada no período selecionado.</p>
        </div>
      )}
    </div>
  );
}
