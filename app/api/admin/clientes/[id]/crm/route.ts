import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCrmAdapter } from "@/lib/crm/factory";

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const config = await prisma.crmConfig.findUnique({ where: { clienteId: id } });
  if (!config) return NextResponse.json(null);

  const safe = {
    id: config.id,
    clienteId: config.clienteId,
    tipo: config.tipo,
    dominio: config.dominio,
    ativo: config.ativo,
    ultimoSyncAt: config.ultimoSyncAt,
    credenciais: config.credenciais,
  };
  return NextResponse.json(safe);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: {
    tipo?: string;
    dominio?: string | null;
    credenciais?: Record<string, string>;
    ativo?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.tipo) {
    const deleted = await prisma.crmConfig.deleteMany({ where: { clienteId: id } });
    return NextResponse.json({ deleted: deleted.count });
  }

  const validTypes = ["CVCRM", "RDSTATION_CRM", "KOMMO"];
  if (!validTypes.includes(body.tipo)) {
    return NextResponse.json({ error: "Tipo CRM inválido" }, { status: 400 });
  }

  let credenciais: Record<string, unknown> = body.credenciais ?? {};

  if (body.tipo === "RDSTATION_CRM" && Object.keys(credenciais).length === 0) {
    const existing = await prisma.crmConfig.findUnique({ where: { clienteId: id } });
    if (existing?.tipo === "RDSTATION_CRM") {
      credenciais = existing.credenciais as Record<string, unknown>;
    }
  }

  const config = await prisma.crmConfig.upsert({
    where: { clienteId: id },
    create: {
      clienteId: id,
      tipo: body.tipo as "CVCRM" | "RDSTATION_CRM" | "KOMMO",
      dominio: body.dominio ?? null,
      credenciais,
      ativo: body.ativo ?? true,
    },
    update: {
      tipo: body.tipo as "CVCRM" | "RDSTATION_CRM" | "KOMMO",
      dominio: body.dominio ?? null,
      credenciais,
      ativo: body.ativo ?? true,
    },
  });

  return NextResponse.json({ ok: true, id: config.id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.crmConfig.deleteMany({ where: { clienteId: id } });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "test") {
    let draftConfig: {
      tipo?: string;
      dominio?: string | null;
      credenciais?: Record<string, string>;
    } | null = null;

    try {
      const body = await request.json();
      if (body && body.tipo) draftConfig = body;
    } catch {
      /* no body or invalid JSON — fall back to saved config */
    }

    try {
      let adapterConfig: { tipo: string; dominio?: string | null; credenciais: unknown };

      if (draftConfig?.tipo) {
        adapterConfig = {
          tipo: draftConfig.tipo,
          dominio: draftConfig.dominio ?? null,
          credenciais: draftConfig.credenciais ?? {},
        };
      } else {
        const saved = await prisma.crmConfig.findUnique({ where: { clienteId: id } });
        if (!saved) {
          return NextResponse.json({ ok: false, error: "CRM não configurado" }, { status: 404 });
        }
        adapterConfig = saved;
      }

      const adapter = await getCrmAdapter(adapterConfig);
      const result = await adapter.testConnection();
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 });
}
