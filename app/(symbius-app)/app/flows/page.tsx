"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Workflow } from "lucide-react";

type Fluxo = {
  id: string;
  nome: string;
  status: string;
  triggerType: string;
  updatedAt: string;
};

export default function FlowsPage() {
  const [fluxos, setFluxos] = useState<Fluxo[]>([]);

  useEffect(() => {
    fetch("/api/symbius/flows")
      .then((r) => r.json())
      .then((d) => setFluxos(d.fluxos ?? []));
  }, []);

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxos</h1>
          <p className="mt-1 text-[var(--symbius-muted)]">
            Automações visuais para Instagram
          </p>
        </div>
        <Link href="/app/flows/new" className="symbius-btn-primary inline-flex gap-2">
          <Plus className="h-4 w-4" />
          Novo fluxo
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fluxos.length === 0 && (
          <div className="symbius-card col-span-full text-center">
            <Workflow className="mx-auto h-10 w-10 text-[var(--symbius-muted)]" />
            <p className="mt-4 text-[var(--symbius-muted)]">
              Nenhum fluxo ainda. Crie o primeiro!
            </p>
          </div>
        )}
        {fluxos.map((f) => (
          <Link
            key={f.id}
            href={`/app/flows/${f.id}`}
            className="symbius-card transition-colors hover:bg-[var(--symbius-surface-hover)]"
          >
            <div className="flex items-start justify-between">
              <p className="font-semibold">{f.nome}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  f.status === "PUBLISHED"
                    ? "bg-[var(--symbius-accent)]/20 text-[var(--symbius-accent)]"
                    : "bg-[var(--symbius-muted)]/20 text-[var(--symbius-muted)]"
                }`}
              >
                {f.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--symbius-muted)]">
              Trigger: {f.triggerType}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
