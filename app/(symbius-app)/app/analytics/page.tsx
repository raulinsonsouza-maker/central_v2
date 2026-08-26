"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  summary: {
    totalContatos: number;
    totalExecucoes: number;
    linkClicks: number;
    emailsCapturados: number;
    followsConfirmados: number;
    handoffs: number;
  };
  fluxos: Array<{
    id: string;
    nome: string;
    status: string;
    triggerType: string;
    execucoes: number;
  }>;
};

type AttributionSummary = {
  revenue: number;
  leads: number;
  customers: number;
  orders: number;
  averageTicket: number;
  spend: number;
  roas: number | null;
  model: string;
  byCampaign: Array<{
    campaign: string;
    source: string;
    medium: string;
    orders: number;
    revenue: number;
  }>;
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [attr, setAttr] = useState<AttributionSummary | null>(null);
  const [model, setModel] = useState("first_touch");

  useEffect(() => {
    void fetch("/api/symbius/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    void fetch(`/api/symbius/attribution/summary?model=${model}`)
      .then((r) => r.json())
      .then(setAttr);
  }, [model]);

  if (!data) {
    return (
      <div className="symbius-light min-h-full bg-[#f4f5f7] p-10">
        <p className="text-zinc-500">Carregando analytics...</p>
      </div>
    );
  }

  const cards = [
    { label: "Contatos", value: data.summary.totalContatos },
    { label: "Execuções", value: data.summary.totalExecucoes },
    { label: "Cliques em link", value: data.summary.linkClicks },
    { label: "E-mails capturados", value: data.summary.emailsCapturados },
    { label: "Follows confirmados", value: data.summary.followsConfirmados },
    { label: "Handoffs", value: data.summary.handoffs },
  ];

  return (
    <div className="symbius-light min-h-full bg-[#f4f5f7] p-6 text-zinc-900 md:p-10">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-1 text-zinc-500">Automações e receita atribuída</p>

      {attr && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Symbius Attribution</h2>
              <p className="text-sm text-zinc-500">Últimos 30 dias</p>
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="first_touch">First touch</option>
              <option value="last_touch">Last touch</option>
              <option value="linear">Linear</option>
              <option value="position_based">Position based</option>
              <option value="time_decay">Time decay</option>
            </select>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="symbius-card">
              <p className="text-sm text-zinc-500">Receita atribuída</p>
              <p className="mt-1 text-2xl font-bold">{brl(attr.revenue)}</p>
            </div>
            <div className="symbius-card">
              <p className="text-sm text-zinc-500">Leads</p>
              <p className="mt-1 text-2xl font-bold">{attr.leads}</p>
            </div>
            <div className="symbius-card">
              <p className="text-sm text-zinc-500">Clientes</p>
              <p className="mt-1 text-2xl font-bold">{attr.customers}</p>
            </div>
            <div className="symbius-card">
              <p className="text-sm text-zinc-500">Investimento</p>
              <p className="mt-1 text-2xl font-bold">{brl(attr.spend)}</p>
            </div>
            <div className="symbius-card">
              <p className="text-sm text-zinc-500">ROAS</p>
              <p className="mt-1 text-2xl font-bold">
                {attr.roas != null ? `${attr.roas.toFixed(2)}x` : "—"}
              </p>
            </div>
          </div>
          <div className="mt-6 symbius-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Campanha</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="px-4 py-3 text-right font-semibold">Pedidos</th>
                  <th className="px-4 py-3 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {attr.byCampaign.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      Nenhuma compra atribuída ainda. Envie POST /api/v1/purchases.
                    </td>
                  </tr>
                ) : (
                  attr.byCampaign.map((row) => (
                    <tr
                      key={`${row.source}-${row.medium}-${row.campaign}`}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-4 py-3 font-medium">{row.campaign}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {row.source} / {row.medium}
                      </td>
                      <td className="px-4 py-3 text-right">{row.orders}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {brl(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="symbius-card">
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 symbius-card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Fluxo</th>
              <th className="px-4 py-3 text-left font-semibold">Gatilho</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Execuções</th>
            </tr>
          </thead>
          <tbody>
            {data.fluxos.map((f) => (
              <tr key={f.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{f.nome}</td>
                <td className="px-4 py-3 text-zinc-500">{f.triggerType}</td>
                <td className="px-4 py-3">{f.status}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {f.execucoes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
