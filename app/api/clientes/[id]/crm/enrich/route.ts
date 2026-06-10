import { NextRequest, NextResponse } from "next/server";
import { enrichCrmLeads } from "@/lib/rdMarketing/enrich";

/**
 * POST /api/clientes/[id]/crm/enrich
 * Dispara enriquecimento de leads CRM com dados do RD Station Marketing.
 * Fire-and-forget com background=1; síncrono sem esse param.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const background = request.nextUrl.searchParams.get("background") === "1";

  if (background) {
    enrichCrmLeads(id).catch(() => {});
    return NextResponse.json({ ok: true, queued: true });
  }

  const result = await enrichCrmLeads(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
