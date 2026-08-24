"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TEMPLATES = [
  {
    id: "welcome",
    title: "Boas-vindas",
    desc: "Resposta automática na primeira DM",
  },
  {
    id: "comment_dm",
    title: "Comentário → DM",
    desc: "Keyword no comentário dispara mensagem privada",
  },
  {
    id: "keyword",
    title: "Keyword em DM",
    desc: "Responde quando receber palavra-chave",
  },
  {
    id: "blank",
    title: "Em branco",
    desc: "Comece do zero no builder",
  },
];

export default function NewFlowPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(template: string) {
    if (!nome.trim()) {
      alert("Digite um nome para o fluxo");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/symbius/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, template }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push(`/app/flows/${data.fluxo.id}`);
    } else {
      alert(data.error ?? "Erro");
    }
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Novo fluxo</h1>
      <p className="mt-1 text-[var(--symbius-muted)]">Escolha um template</p>

      <div className="mt-6 max-w-md">
        <label className="mb-1 block text-sm">Nome do fluxo</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="symbius-input"
          placeholder="Ex: Boas-vindas Instagram"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={loading}
            onClick={() => create(t.id)}
            className="symbius-card text-left transition-colors hover:border-[var(--symbius-primary)] hover:bg-[var(--symbius-surface-hover)]"
          >
            <p className="font-semibold">{t.title}</p>
            <p className="mt-2 text-sm text-[var(--symbius-muted)]">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
