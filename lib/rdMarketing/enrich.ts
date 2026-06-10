/**
 * Enriquece leads do CRM com dados da API de Marketing do RD Station.
 *
 * Fluxo:
 * 1. Busca token do RdMarketingConfig do cliente
 * 2. Para cada LeadCrm sem dadosMarketing (ou com enrichAt antigo):
 *    a. Tenta por rdContactId (UUID do contato RD) — mais rápido
 *    b. Fallback: busca por email
 * 3. Normaliza cf_* → MarketingEnrichment
 * 4. Salva em LeadCrm.dadosMarketing
 */

import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";
import { RdMarketingClient, normalizeEnrichment } from "./client";

export interface EnrichResult {
  ok: boolean;
  enriched: number;
  skipped: number;
  error?: string;
}

export async function enrichCrmLeads(clienteId: string): Promise<EnrichResult> {
  // 1. Busca config de Marketing
  const mktConfig = await prisma.rdMarketingConfig.findUnique({ where: { clienteId } });
  if (!mktConfig?.ativo) {
    return { ok: true, enriched: 0, skipped: 0, error: "RD Marketing não configurado" };
  }

  const creds = mktConfig.credenciais as Record<string, unknown>;
  const accessToken = creds.accessToken as string | undefined;
  if (!accessToken) {
    return { ok: false, enriched: 0, skipped: 0, error: "Token de Marketing não encontrado — faça o OAuth" };
  }

  const client = new RdMarketingClient(accessToken);

  // 2. Busca leads sem enriquecimento (dadosMarketing null) com email ou rdContactId
  const leads = await prisma.leadCrm.findMany({
    where: {
      clienteId,
      dadosMarketing: { equals: Prisma.DbNull },
      OR: [
        { rdContactId: { not: null } },
        { email: { not: null } },
      ],
    },
    select: { id: true, rdContactId: true, email: true },
    take: 200,
  });

  let enriched = 0;
  let skipped = 0;

  for (const lead of leads) {
    try {
      let contact = null;

      // Tenta por UUID primeiro (mais preciso)
      if (lead.rdContactId) {
        contact = await client.getContact(lead.rdContactId);
      }

      // Fallback por email
      if (!contact && lead.email) {
        contact = await client.findByEmail(lead.email);
      }

      if (!contact) {
        skipped++;
        continue;
      }

      const enrichment = normalizeEnrichment(contact);

      await prisma.leadCrm.update({
        where: { id: lead.id },
        data: {
          dadosMarketing: enrichment as unknown as Prisma.InputJsonValue,
          // Atualiza rdContactId se não estava preenchido
          ...(lead.rdContactId ? {} : { rdContactId: contact.uuid }),
        },
      });

      enriched++;
    } catch {
      skipped++;
    }
  }

  // Atualiza ultimoSyncAt do config de Marketing
  await prisma.rdMarketingConfig.update({
    where: { clienteId },
    data: { ultimoSyncAt: new Date() },
  });

  return { ok: true, enriched, skipped };
}
