import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Normaliza a fonte do RD Station CRM para um canal de mídia canônico.
 * A lista de termos cobre os nomes mais comuns que os usuários configuram.
 */
function canalFromFonte(
  fonte: string | null,
): "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO" {
  if (!fonte) return "OUTRO";
  const f = fonte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos para comparação

  // Meta / Instagram / Facebook
  if (
    f.includes("facebook") ||
    f.includes("meta") ||
    f.includes("instagram") ||
    f.includes("fb ads") ||
    f.includes("meta ads") ||
    f.includes("ig ads")
  )
    return "META";

  // Google (Ads, Search, Display, PMax, YouTube)
  if (
    f.includes("google") ||
    f.includes("busca paga") ||
    f.includes("youtube") ||
    f.includes("display") ||
    f.includes("pmax") ||
    f.includes("performance max")
  )
    return "GOOGLE";

  // Orgânico / SEO / Redes sociais não pagas
  if (
    f.includes("organic") ||
    f.includes("organico") ||
    f.includes("organica") ||
    f.includes("seo") ||
    f.includes("busca organica") ||
    f.includes("social organico") ||
    f.includes("social organic")
  )
    return "ORGANICO";

  // Indicação / Referência
  if (
    f.includes("indica") ||
    f.includes("referral") ||
    f.includes("referencia") ||
    f.includes("parceiro") ||
    f.includes("boca a boca") ||
    f.includes("word of mouth")
  )
    return "INDICACAO";

  // Direto / Site / WhatsApp / Landing page sem mídia
  if (
    f.includes("direto") ||
    f.includes("direct") ||
    f.includes("whatsapp") ||
    f.includes("site") ||
    f.includes("landing") ||
    f.includes("formulario") ||
    f.includes("email")
  )
    return "DIRETO";

  return "OUTRO";
}

/**
 * GET /api/clientes/[id]/crm/atribuicao
 *
 * Agrupa leads CRM por fonte, mostra status real de cada canal
 * (ganhos / perdidos / em andamento) e cruza com o investimento
 * de mídia (Meta + Google) do mesmo período.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const dateFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const dateTo = toParam ? new Date(toParam) : now;

  const config = await prisma.crmConfig.findUnique({
    where: { clienteId: id },
    select: { ativo: true, tipo: true, ultimoSyncAt: true },
  });
  if (!config?.ativo) {
    return NextResponse.json({ configured: false });
  }

  // Busca todos os leads no período com os campos necessários
  const leads = await prisma.leadCrm.findMany({
    where: { clienteId: id, dataEntrada: { gte: dateFrom, lte: dateTo } },
    select: { fonte: true, valor: true, dataFechamento: true, status: true, rating: true },
  });

  // Investimento de mídia no período
  const fatoRows = await prisma.fatoMidiaDiario.findMany({
    where: {
      clienteId: id,
      data: { gte: dateFrom, lte: dateTo },
      canal: { in: ["META", "GOOGLE"] },
    },
    select: { canal: true, investimento: true, leads: true, conversoes: true },
  });

  const investMeta = fatoRows
    .filter((r) => r.canal === "META")
    .reduce((s, r) => s + Number(r.investimento), 0);
  const investGoogle = fatoRows
    .filter((r) => r.canal === "GOOGLE")
    .reduce((s, r) => s + Number(r.investimento), 0);

  // Leads de campanha (platform side — para CPL de campanha)
  const leadsMeta = fatoRows
    .filter((r) => r.canal === "META")
    .reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);
  const leadsGoogle = fatoRows
    .filter((r) => r.canal === "GOOGLE")
    .reduce((s, r) => s + Math.max(r.leads, r.conversoes), 0);

  // ── Agrupa por fonte ────────────────────────────────────────────────────────
  type Bucket = {
    leads: number;
    ganhos: number;   // status = won
    perdidos: number; // status = lost
    andamento: number; // ongoing | paused | null
    valor: number;
    ratingSum: number;
    ratingCount: number;
  };

  const fonteMap = new Map<string, Bucket>();

  for (const lead of leads) {
    const key = lead.fonte ?? "(sem fonte)";
    let bucket = fonteMap.get(key);
    if (!bucket) {
      bucket = { leads: 0, ganhos: 0, perdidos: 0, andamento: 0, valor: 0, ratingSum: 0, ratingCount: 0 };
      fonteMap.set(key, bucket);
    }
    bucket.leads++;
    if (lead.status === "won") {
      bucket.ganhos++;
      bucket.valor += lead.valor ? Number(lead.valor) : 0;
    } else if (lead.status === "lost") {
      bucket.perdidos++;
    } else {
      bucket.andamento++;
    }
    if (lead.rating != null) {
      bucket.ratingSum += lead.rating;
      bucket.ratingCount++;
    }
  }

  // ── Monta resposta por fonte ────────────────────────────────────────────────
  const porFonte = [...fonteMap.entries()]
    .map(([fonte, b]) => {
      const canal = canalFromFonte(fonte === "(sem fonte)" ? null : fonte);
      const invest =
        canal === "META" ? investMeta :
        canal === "GOOGLE" ? investGoogle :
        null;

      const taxaGanho = b.leads > 0 ? Math.round((b.ganhos / b.leads) * 100) : 0;
      const taxaPerda = b.leads > 0 ? Math.round((b.perdidos / b.leads) * 100) : 0;

      return {
        fonte,
        canal,
        leads: b.leads,
        ganhos: b.ganhos,
        perdidos: b.perdidos,
        andamento: b.andamento,
        valor: b.valor,
        taxaGanho,
        taxaPerda,
        ratingMedio: b.ratingCount > 0 ? Math.round((b.ratingSum / b.ratingCount) * 10) / 10 : null,
        investCanal: invest,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // ── Totais globais ──────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const totalGanhos = leads.filter((l) => l.status === "won").length;
  const totalPerdidos = leads.filter((l) => l.status === "lost").length;
  const totalAndamento = totalLeads - totalGanhos - totalPerdidos;
  const totalValor = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + (l.valor ? Number(l.valor) : 0), 0);

  // ── CPL real: investimento do canal ÷ leads CRM atribuídos ao canal ─────────
  const metaCrmLeads = porFonte.filter((f) => f.canal === "META").reduce((s, f) => s + f.leads, 0);
  const googleCrmLeads = porFonte.filter((f) => f.canal === "GOOGLE").reduce((s, f) => s + f.leads, 0);

  return NextResponse.json({
    configured: true,
    periodo: { from: dateFrom, to: dateTo },
    totalLeads,
    totalGanhos,
    totalPerdidos,
    totalAndamento,
    totalValor,
    investMeta,
    investGoogle,
    leadsMeta,
    leadsGoogle,
    metaCrmLeads,
    googleCrmLeads,
    cplMetaCampanha: leadsMeta > 0 ? investMeta / leadsMeta : null,
    cplGoogleCampanha: leadsGoogle > 0 ? investGoogle / leadsGoogle : null,
    cplMetaCrm: metaCrmLeads > 0 ? investMeta / metaCrmLeads : null,
    cplGoogleCrm: googleCrmLeads > 0 ? investGoogle / googleCrmLeads : null,
    porFonte,
    ultimoSyncAt: config.ultimoSyncAt,
  });
}
