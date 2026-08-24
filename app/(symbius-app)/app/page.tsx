import Link from "next/link";
import { ArrowRight, Inbox, Plug, Workflow } from "lucide-react";
import { getSession } from "@/lib/symbius/auth";
import { getOrganizationForSession } from "@/lib/symbius/tenant";

export default async function SymbiusDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const org = await getOrganizationForSession(session);
  const ig = org.igAccounts[0];

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Olá, {session.nome.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-[var(--symbius-muted)]">{org.nome}</p>

      {!ig ? (
        <div className="symbius-card mt-8 border-dashed">
          <Plug className="h-10 w-10 text-[var(--symbius-primary)]" />
          <h2 className="mt-4 text-lg font-semibold">Conecte seu Instagram</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--symbius-muted)]">
            Vincule sua conta Professional em poucos passos e comece a automatizar.
          </p>
          <Link href="/app/connect" className="symbius-btn-primary mt-6 inline-flex gap-2">
            Conectar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="symbius-card">
            <p className="text-sm text-[var(--symbius-muted)]">Instagram conectado</p>
            <p className="mt-2 font-semibold">@{ig.igUsername ?? ig.igUserId}</p>
          </div>
          <div className="symbius-card">
            <p className="text-sm text-[var(--symbius-muted)]">Fluxos publicados</p>
            <p className="mt-2 text-2xl font-bold">
              {org._count.fluxos}
            </p>
          </div>
          <div className="symbius-card">
            <p className="text-sm text-[var(--symbius-muted)]">Plano</p>
            <p className="mt-2 font-semibold">{org.plan}</p>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/app/inbox" className="symbius-card flex items-center gap-4 transition-colors hover:bg-[var(--symbius-surface-hover)]">
          <Inbox className="h-8 w-8 text-[var(--symbius-primary)]" />
          <div>
            <p className="font-semibold">Inbox</p>
            <p className="text-sm text-[var(--symbius-muted)]">Conversas e respostas manuais</p>
          </div>
        </Link>
        <Link href="/app/flows" className="symbius-card flex items-center gap-4 transition-colors hover:bg-[var(--symbius-surface-hover)]">
          <Workflow className="h-8 w-8 text-[var(--symbius-accent)]" />
          <div>
            <p className="font-semibold">Fluxos</p>
            <p className="text-sm text-[var(--symbius-muted)]">Automações visuais</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
