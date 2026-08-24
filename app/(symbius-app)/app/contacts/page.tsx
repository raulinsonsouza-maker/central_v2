import { redirect } from "next/navigation";
import { getSession } from "@/lib/symbius/auth";
import { getOrganizationForSession } from "@/lib/symbius/tenant";
import { prisma } from "@/lib/db";

export default async function ContactsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contatos = await prisma.igContato.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { lastInteractionAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Contatos</h1>
      <p className="mt-1 text-[var(--symbius-muted)]">
        Pessoas que interagiram com suas automações
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--symbius-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--symbius-surface)]">
            <tr>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">Tags</th>
              <th className="px-4 py-3 text-left">Última interação</th>
              <th className="px-4 py-3 text-left">Bot</th>
            </tr>
          </thead>
          <tbody>
            {contatos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--symbius-muted)]">
                  Nenhum contato ainda
                </td>
              </tr>
            )}
            {contatos.map((c) => (
              <tr key={c.id} className="border-t border-[var(--symbius-border)]">
                <td className="px-4 py-3">
                  {c.username ? `@${c.username}` : c.nome ?? c.igsid}
                </td>
                <td className="px-4 py-3">
                  {c.tags.length ? c.tags.join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  {c.lastInteractionAt
                    ? new Date(c.lastInteractionAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {c.botPaused ? "Pausado (humano)" : "Ativo"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
