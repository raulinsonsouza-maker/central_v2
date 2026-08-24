import { redirect } from "next/navigation";
import { getSession } from "@/lib/symbius/auth";
import { getOrganizationForSession } from "@/lib/symbius/tenant";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await getOrganizationForSession(session);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <p className="mt-1 text-[var(--symbius-muted)]">Organização e plano</p>

      <div className="mt-8 max-w-lg space-y-4">
        <div className="symbius-card">
          <p className="text-sm text-[var(--symbius-muted)]">Organização</p>
          <p className="mt-1 font-semibold">{org.nome}</p>
          <p className="text-sm text-[var(--symbius-muted)]">{session.email}</p>
        </div>
        <div className="symbius-card">
          <p className="text-sm text-[var(--symbius-muted)]">Plano atual</p>
          <p className="mt-1 text-xl font-bold">{org.plan}</p>
          <ul className="mt-4 space-y-1 text-sm text-[var(--symbius-muted)]">
            <li>Contas IG: {org.igAccounts.length} / {org.maxIgAccounts}</li>
            <li>Fluxos: {org._count.fluxos} / {org.maxFluxos >= 999 ? "∞" : org.maxFluxos}</li>
            <li>Membros: {org._count.members} / {org.maxMembers}</li>
          </ul>
        </div>
        <div className="symbius-card">
          <p className="text-sm text-[var(--symbius-muted)]">Contas conectadas</p>
          {org.igAccounts.length === 0 ? (
            <p className="mt-2 text-sm">Nenhuma conta conectada</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {org.igAccounts.map((a) => (
                <li key={a.id} className="text-sm">
                  @{a.igUsername ?? a.igUserId}{" "}
                  <span className="text-[var(--symbius-accent)]">({a.status})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
