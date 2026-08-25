import { redirect } from "next/navigation";
import { getSession } from "@/lib/symbius/auth";
import { prisma } from "@/lib/db";
import { ContactsClient } from "@/components/symbius/ContactsClient";

export default async function ContactsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contatos = await prisma.igContato.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { lastInteractionAt: "desc" },
    take: 100,
  });

  const rows = contatos.map((c) => ({
    id: c.id,
    igsid: c.igsid,
    nome: c.nome,
    username: c.username,
    tags: c.tags,
    botPaused: c.botPaused,
    lastInteractionAt: c.lastInteractionAt
      ? c.lastInteractionAt.toISOString()
      : null,
  }));

  return (
    <div className="symbius-light min-h-full bg-[#f4f5f7] p-6 text-zinc-900 md:p-10">
      <h1 className="text-2xl font-bold text-zinc-900">Contatos</h1>
      <p className="mt-1 text-zinc-500">
        Pessoas que interagiram com suas automações
      </p>
      <div className="mt-8">
        <ContactsClient initialContacts={rows} />
      </div>
    </div>
  );
}
