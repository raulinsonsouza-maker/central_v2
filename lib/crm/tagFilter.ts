import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

/**
 * Returns the Prisma `WhereInput` fragment that restricts leads to those whose
 * `dadosCv.tags` array contains at least one of the configured tags.
 * Returns `{}` (no restriction) when no tag filter is configured.
 */
export function buildTagFilterWhere(tagFilter: string[]): Prisma.LeadCrmWhereInput {
  if (!tagFilter || tagFilter.length === 0) return {};
  return {
    OR: tagFilter.map((tag) => ({
      dadosCv: { path: ["tags"], array_contains: tag },
    })),
  };
}

/**
 * Loads the tag filter for a client from their CrmConfig credentials.
 * Returns an empty array when no config or no tag filter is set.
 */
export async function getTagFilter(clienteId: string): Promise<string[]> {
  const config = await prisma.crmConfig.findUnique({
    where: { clienteId },
    select: { credenciais: true, ativo: true },
  });
  if (!config || !config.ativo) return [];
  const creds = config.credenciais as Record<string, unknown>;
  const raw = creds.tagFilter;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return (raw as unknown[]).filter((t): t is string => typeof t === "string" && t.trim() !== "");
}
