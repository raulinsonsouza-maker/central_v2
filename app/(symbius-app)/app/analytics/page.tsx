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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    void fetch("/api/symbius/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

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
      <p className="mt-1 text-zinc-500">Métricas das suas automações</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
