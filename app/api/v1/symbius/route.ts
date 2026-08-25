import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPublicApiKey } from "@/lib/symbius/integrations";

async function authOrg(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const orgId = request.headers.get("x-organization-id");
  if (!orgId || !apiKey) return null;
  const ok = await verifyPublicApiKey(orgId, apiKey);
  return ok ? orgId : null;
}

export async function GET(request: NextRequest) {
  const orgId = await authOrg(request);
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contatos = await prisma.igContato.findMany({
    where: { organizationId: orgId },
    take: 100,
    orderBy: { lastInteractionAt: "desc" },
  });

  return NextResponse.json({ contatos });
}

export async function POST(request: NextRequest) {
  const orgId = await authOrg(request);
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: string;
    contatoId?: string;
    fluxoId?: string;
    tags?: string[];
  };

  if (body.action === "trigger_flow" && body.contatoId && body.fluxoId) {
    const { triggerManualFluxo } = await import("@/lib/symbius/manualFluxo");
    const ok = await triggerManualFluxo({
      organizationId: orgId,
      fluxoId: body.fluxoId,
      contatoId: body.contatoId,
      context: { manual: true, api: true },
    });
    return NextResponse.json({ ok });
  }

  if (body.action === "add_tags" && body.contatoId && body.tags?.length) {
    const contato = await prisma.igContato.findFirst({
      where: { id: body.contatoId, organizationId: orgId },
    });
    if (!contato) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
    }
    const tags = Array.from(new Set([...contato.tags, ...body.tags]));
    await prisma.igContato.update({ where: { id: contato.id }, data: { tags } });
    return NextResponse.json({ ok: true, tags });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
