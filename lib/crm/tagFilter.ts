import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

/**
 * Parses the raw dadosCv.tags value into a string array.
 * The CV CRM API historically stored tags as a string (comma-separated);
 * newer syncs store them as a proper string[]. Both must be handled.
 */
export function parseTagsField(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).filter(Boolean);
  if (typeof raw === "string") {
    return raw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Returns the Prisma `WhereInput` fragment that restricts leads to those whose
 * `dadosCv.tags` contains at least one of the configured tags.
 *
 * Handles both storage formats:
 *   - array  (new syncs):  `["form_meta_arboreto_inout","lp_arboreto_inout"]`
 *   - string (legacy):     `"lp_arboreto_inout"` or `"arboreto_inout, lp_arboreto_inout"`
 *
 * Returns `{}` (no restriction) when no tag filter is configured.
 */
export function buildTagFilterWhere(tagFilter: string[]): Prisma.LeadCrmWhereInput {
  if (!tagFilter || tagFilter.length === 0) return {};
  return {
    OR: tagFilter.flatMap((tag) => [
      // Array format (new syncs after adapter fix)
      { dadosCv: { path: ["tags"], array_contains: tag } },
      // String format (legacy — exact single tag stored as JSON string)
      { dadosCv: { path: ["tags"], equals: tag } },
      // String format (legacy — comma-separated, tag appears somewhere in string)
      { dadosCv: { path: ["tags"], string_contains: tag } },
    ]),
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
