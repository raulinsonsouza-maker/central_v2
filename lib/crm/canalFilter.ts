import type { Prisma } from "@/lib/generated/prisma";

/**
 * Canal filter patterns for dadosCv.midiaOriginal (JSON path — case-sensitive LIKE).
 * Include all common capitalizations seen in CV CRM data.
 * Logic mirrors canalFromMidia() in the atribuicao route.
 */
const CANAL_MIDIA_PATTERNS: Record<string, string[]> = {
  META: [
    "facebook", "Facebook", "FACEBOOK",
    "Meta", "meta", "META",
    "Instagram", "instagram", "INSTAGRAM",
    "fb ads", "FB Ads", "FB ADS",
    "meta ads", "Meta Ads", "META ADS",
  ],
  GOOGLE: [
    "google", "Google", "GOOGLE",
    "youtube", "YouTube", "YOUTUBE",
    "pmax", "PMax", "PMAX",
    "busca paga", "Busca Paga", "BUSCA PAGA",
    "performance max", "Performance Max", "PERFORMANCE MAX",
  ],
  ORGANICO: [
    "orgânico", "Orgânico", "ORGÂNICO",
    "organico", "Organico", "ORGANICO",
    "organic", "Organic", "ORGANIC",
    "seo", "SEO",
  ],
  INDICACAO: [
    "indicação", "Indicação",
    "indicacao", "Indicacao",
    "referral", "Referral", "REFERRAL",
    "referência", "Referência",
    "indica", "Indica",
  ],
  DIRETO: [
    "direto", "Direto", "DIRETO",
    "direct", "Direct", "DIRECT",
    "whatsapp", "WhatsApp", "WHATSAPP",
    "site", "Site", "SITE",
    "email", "Email", "EMAIL",
  ],
};

/**
 * Builds OR conditions against dadosCv.midiaOriginal for a given canal key.
 * Falls back to fonte column patterns when midiaOriginal is absent.
 */
function buildMidiaOR(canal: string): Prisma.LeadCrmWhereInput[] {
  const patterns = CANAL_MIDIA_PATTERNS[canal] ?? [];
  return [
    // Check dadosCv.midiaOriginal (primary canal signal in CV CRM)
    ...patterns.map((p) => ({
      dadosCv: { path: ["midiaOriginal"], string_contains: p },
    })),
    // Fallback: check fonte column (standard insensitive mode)
    ...patterns.map((p) => ({
      fonte: { contains: p, mode: "insensitive" as const },
    })),
  ];
}

export function buildCanalFonteOR(canal: string): Prisma.LeadCrmWhereInput[] {
  return buildMidiaOR(canal);
}

/**
 * Builds a Prisma WHERE fragment that isolates leads belonging to `canal`.
 * Special case: "OUTRO" means "does not match any known canal pattern".
 */
function buildCanalWhere(canal: string): Prisma.LeadCrmWhereInput {
  if (canal === "OUTRO") {
    // Negate every known canal pattern so only unclassified leads match.
    const allKnownOR = Object.keys(CANAL_MIDIA_PATTERNS).flatMap(buildMidiaOR);
    return allKnownOR.length > 0 ? { NOT: { OR: allKnownOR } } : {};
  }
  const or = buildMidiaOR(canal);
  return or.length > 0 ? { OR: or } : {};
}

/**
 * Builds a Prisma WHERE fragment from a filterType/filterValue pair.
 * Returns `{}` when no filter is set.
 */
export function buildLeadFilterWhere(
  filterType: string | null,
  filterValue: string | null,
): Prisma.LeadCrmWhereInput {
  if (!filterType || !filterValue) return {};

  if (filterType === "canal") {
    if (filterValue === "META_CONFIRMED") {
      return { metaLeadId: { not: null } };
    }
    if (filterValue === "META_CRM") {
      const or = buildMidiaOR("META");
      return or.length > 0 ? { metaLeadId: null, OR: or } : { metaLeadId: null };
    }
    return buildCanalWhere(filterValue);
  }

  if (filterType === "estado") {
    return { dadosCv: { path: ["estado"], equals: filterValue } };
  }

  if (filterType === "conversao") {
    return { dadosCv: { path: ["conversaoOriginal"], equals: filterValue } };
  }

  if (filterType === "etapa") {
    return { etapa: filterValue };
  }

  // Filtros da hierarquia Meta (campanha / conjunto / anúncio) gravados no lead.
  // value = ID do Meta (campaignId/adsetId/adId) gravado em dadosMarketing.
  if (filterType === "metaCampaign") {
    return { dadosMarketing: { path: ["metaCampaignId"], equals: filterValue } };
  }
  if (filterType === "metaAdset") {
    return { dadosMarketing: { path: ["metaAdsetId"], equals: filterValue } };
  }
  if (filterType === "metaAd") {
    return { dadosMarketing: { path: ["metaAdId"], equals: filterValue } };
  }

  if (filterType === "funil") {
    // value = "CANAL|stage" (stage: leads | atendimento | visitas | vendas)
    const [canal, stage] = filterValue.split("|");
    const canalWhere = buildCanalWhere(canal);
    if (stage === "vendas") return { AND: [canalWhere, { status: "won" }] };
    // andamento (atendimento) = tudo que não é won/lost, incluindo status nulo
    // (espelha o else do bucket em /crm/atribuicao, onde status null cai em andamento)
    if (stage === "atendimento") return { AND: [canalWhere, { NOT: { status: { in: ["won", "lost"] } } }] };
    if (stage === "visitas") return { AND: [canalWhere, { etapa: { contains: "visit", mode: "insensitive" } }] };
    return canalWhere; // leads (todos do canal)
  }

  return {};
}
