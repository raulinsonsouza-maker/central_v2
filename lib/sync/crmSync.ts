import { prisma } from "@/lib/db";
import { getCrmAdapter } from "@/lib/crm/factory";
import { phoneKey, emailKey } from "@/lib/crm/matching";

export interface CrmSyncResult {
  ok: boolean;
  leadsProcessed: number;
  leadsUpserted: number;
  leadsMatched: number;
  error?: string;
}

/**
 * Match unattributed CRM leads to MetaLeadIndividual records by phone/email.
 * Uses the last-8-digits phone key and lowercased email for fuzzy matching.
 * Only processes leads that have a phone or email but no metaLeadId yet.
 */
async function matchCrmLeadsToMeta(clienteId: string): Promise<number> {
  const unmatched = await prisma.leadCrm.findMany({
    where: {
      clienteId,
      metaLeadId: null,
      OR: [
        { telefone: { not: null } },
        { email: { not: null } },
      ],
    },
    select: { id: true, telefone: true, email: true },
  });

  if (unmatched.length === 0) return 0;

  const metaLeads = await prisma.metaLeadIndividual.findMany({
    where: {
      clienteId,
      OR: [
        { telefone: { not: null } },
        { emailLead: { not: null } },
      ],
    },
    select: { metaLeadId: true, telefone: true, emailLead: true },
  });

  const phoneMap = new Map<string, string>();
  const emailMap = new Map<string, string>();

  for (const ml of metaLeads) {
    const pk = phoneKey(ml.telefone);
    if (pk) phoneMap.set(pk, ml.metaLeadId);
    const ek = emailKey(ml.emailLead);
    if (ek) emailMap.set(ek, ml.metaLeadId);
  }

  let matched = 0;
  for (const lead of unmatched) {
    const pk = phoneKey(lead.telefone);
    const ek = emailKey(lead.email);

    const metaId =
      (pk ? phoneMap.get(pk) : undefined) ??
      (ek ? emailMap.get(ek) : undefined) ??
      null;

    if (metaId) {
      await prisma.leadCrm.update({
        where: { id: lead.id },
        data: { metaLeadId: metaId },
      });
      matched++;
    }
  }

  return matched;
}

export async function syncCrmCliente(clienteId: string): Promise<CrmSyncResult> {
  const config = await prisma.crmConfig.findUnique({ where: { clienteId } });

  if (!config || !config.ativo) {
    return { ok: true, leadsProcessed: 0, leadsUpserted: 0, leadsMatched: 0 };
  }

  try {
    const adapter = getCrmAdapter(config);

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
          telefone: lead.telefone ?? null,
          email: lead.email ?? null,
          dataEntrada: lead.dataEntrada,
          dataFechamento: lead.dataFechamento ?? null,
          valor: lead.valor ?? null,
        },
        update: {
          etapa: lead.etapa,
          ordemEtapa: lead.ordemEtapa ?? null,
          telefone: lead.telefone ?? null,
          email: lead.email ?? null,
          dataFechamento: lead.dataFechamento ?? null,
          valor: lead.valor ?? null,
        },
      });
      upserted++;
    }

    await prisma.crmConfig.update({
      where: { id: config.id },
      data: { ultimoSyncAt: new Date() },
    });

    const leadsMatched = await matchCrmLeadsToMeta(clienteId);

    return { ok: true, leadsProcessed: leads.length, leadsUpserted: upserted, leadsMatched };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, leadsProcessed: 0, leadsUpserted: 0, leadsMatched: 0, error };
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
