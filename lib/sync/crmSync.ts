import { prisma } from "@/lib/db";
import { getCrmAdapter } from "@/lib/crm/factory";

export interface CrmSyncResult {
  ok: boolean;
  leadsProcessed: number;
  leadsUpserted: number;
  error?: string;
}

export async function syncCrmCliente(clienteId: string): Promise<CrmSyncResult> {
  const config = await prisma.crmConfig.findUnique({ where: { clienteId } });

  if (!config || !config.ativo) {
    return { ok: true, leadsProcessed: 0, leadsUpserted: 0 };
  }

  try {
    const adapter = await getCrmAdapter(config);

    const since = config.ultimoSyncAt
      ? new Date(config.ultimoSyncAt.getTime() - 3 * 24 * 60 * 60 * 1000)
      : undefined;

    const leads = await adapter.fetchLeads(since ? { since } : undefined);

    let upserted = 0;
    for (const lead of leads) {
      await prisma.leadCrm.upsert({
        where: { clienteId_crmLeadId: { clienteId, crmLeadId: lead.crmLeadId } },
        create: {
          clienteId,
          crmConfigId: config.id,
          crmLeadId: lead.crmLeadId,
          etapa: lead.etapa,
          ordemEtapa: lead.ordemEtapa ?? null,
          dataEntrada: lead.dataEntrada,
          dataFechamento: lead.dataFechamento ?? null,
          valor: lead.valor ?? null,
          email: lead.email ?? null,
          telefone: lead.telefone ?? null,
        },
        update: {
          etapa: lead.etapa,
          ordemEtapa: lead.ordemEtapa ?? null,
          dataFechamento: lead.dataFechamento ?? null,
          valor: lead.valor ?? null,
          email: lead.email ?? null,
          telefone: lead.telefone ?? null,
        },
      });
      upserted++;
    }

    await prisma.crmConfig.update({
      where: { id: config.id },
      data: { ultimoSyncAt: new Date() },
    });

    return { ok: true, leadsProcessed: leads.length, leadsUpserted: upserted };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, leadsProcessed: 0, leadsUpserted: 0, error };
  }
}

export async function syncCrmTodosClientes(): Promise<Array<{ clienteId: string; error?: string }>> {
  const configs = await prisma.crmConfig.findMany({
    where: { ativo: true },
    select: { clienteId: true },
  });

  const results: Array<{ clienteId: string; error?: string }> = [];

  for (const { clienteId } of configs) {
    const r = await syncCrmCliente(clienteId);
    results.push({ clienteId, error: r.error });
  }

  return results;
}
