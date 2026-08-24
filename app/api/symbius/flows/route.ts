import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/symbius/auth";
import { canPublishFluxo } from "@/lib/symbius/tenant";

const createSchema = z.object({
  nome: z.string().min(1),
  triggerType: z.string(),
  triggerConfig: z.record(z.unknown()).optional(),
  template: z.enum(["welcome", "comment_dm", "keyword", "blank"]).optional(),
  igAccountId: z.string().optional(),
});

function templateNodes(template: string) {
  if (template === "welcome") {
    return [
      {
        tipo: "trigger",
        config: {},
        posX: 100,
        posY: 100,
        nextIds: [] as string[],
      },
      {
        tipo: "send_message",
        config: { text: "Olá! 👋 Obrigado por entrar em contato. Como posso ajudar?" },
        posX: 100,
        posY: 220,
        nextIds: [] as string[],
      },
    ];
  }
  if (template === "comment_dm") {
    return [
      {
        tipo: "trigger",
        config: {},
        posX: 100,
        posY: 100,
        nextIds: [] as string[],
      },
      {
        tipo: "send_message",
        config: {
          text: "Vi seu comentário! Te mandei os detalhes aqui na DM 😊",
        },
        posX: 100,
        posY: 220,
        nextIds: [] as string[],
      },
    ];
  }
  if (template === "keyword") {
    return [
      {
        tipo: "trigger",
        config: {},
        posX: 100,
        posY: 100,
        nextIds: [] as string[],
      },
      {
        tipo: "send_message",
        config: { text: "Aqui está o link que você pediu: https://exemplo.com" },
        posX: 100,
        posY: 220,
        nextIds: [] as string[],
      },
    ];
  }
  return [
    {
      tipo: "trigger",
      config: {},
      posX: 100,
      posY: 100,
      nextIds: [] as string[],
    },
  ];
}

function templateTrigger(template: string) {
  if (template === "welcome") {
    return { triggerType: "welcome", triggerConfig: {} };
  }
  if (template === "comment_dm") {
    return {
      triggerType: "comment_keyword",
      triggerConfig: { keywords: ["link", "quero", "preço"] },
    };
  }
  if (template === "keyword") {
    return {
      triggerType: "keyword",
      triggerConfig: { keywords: ["link", "info"] },
    };
  }
  return { triggerType: "keyword", triggerConfig: { keywords: [] } };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const fluxos = await prisma.igFluxo.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { nos: true } } },
  });

  return NextResponse.json({ fluxos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const template = parsed.data.template ?? "blank";
  const trig =
    template !== "blank"
      ? templateTrigger(template)
      : {
          triggerType: parsed.data.triggerType,
          triggerConfig: parsed.data.triggerConfig ?? {},
        };

  const nodes = templateNodes(template);
  const createdNodes: string[] = [];

  const fluxo = await prisma.$transaction(async (tx) => {
    const f = await tx.igFluxo.create({
      data: {
        organizationId: session.organizationId,
        igAccountId: parsed.data.igAccountId,
        nome: parsed.data.nome,
        status: "DRAFT",
        triggerType: trig.triggerType,
        triggerConfig: trig.triggerConfig as object,
      },
    });

    for (const n of nodes) {
      const created = await tx.igFluxoNo.create({
        data: {
          fluxoId: f.id,
          tipo: n.tipo,
          config: n.config as object,
          posX: n.posX,
          posY: n.posY,
          nextIds: [],
        },
      });
      createdNodes.push(created.id);
    }

    if (createdNodes.length >= 2) {
      await tx.igFluxoNo.update({
        where: { id: createdNodes[0] },
        data: { nextIds: [createdNodes[1]] },
      });
    }

    return f;
  });

  return NextResponse.json({ fluxo });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id: string;
    status?: string;
    nome?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    nodes?: Array<{
      id?: string;
      tipo: string;
      config: Record<string, unknown>;
      posX: number;
      posY: number;
      nextIds: string[];
    }>;
  };

  const fluxo = await prisma.igFluxo.findFirst({
    where: { id: body.id, organizationId: session.organizationId },
  });
  if (!fluxo) {
    return NextResponse.json({ error: "Fluxo não encontrado" }, { status: 404 });
  }

  if (body.status === "PUBLISHED" && !(await canPublishFluxo(session.organizationId))) {
    return NextResponse.json(
      { error: "Limite de fluxos publicados do plano atingido" },
      { status: 403 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.igFluxo.update({
      where: { id: body.id },
      data: {
        nome: body.nome,
        status: body.status,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig as object | undefined,
      },
    });

    if (body.nodes) {
      await tx.igFluxoNo.deleteMany({ where: { fluxoId: body.id } });
      const idMap = new Map<string, string>();

      for (const n of body.nodes) {
        const created = await tx.igFluxoNo.create({
          data: {
            fluxoId: body.id,
            tipo: n.tipo,
            config: n.config as object,
            posX: n.posX,
            posY: n.posY,
            nextIds: [],
          },
        });
        if (n.id) idMap.set(n.id, created.id);
        idMap.set(created.id, created.id);
      }

      const all = await tx.igFluxoNo.findMany({ where: { fluxoId: body.id } });
      for (let i = 0; i < body.nodes.length; i++) {
        const n = body.nodes[i];
        const dbId = all[i]?.id;
        if (!dbId) continue;
        const resolvedNext = n.nextIds
          .map((nid) => {
            const idx = body.nodes!.findIndex((x) => x.id === nid || all[body.nodes!.indexOf(x)]?.id === nid);
            return all[idx]?.id;
          })
          .filter(Boolean) as string[];
        await tx.igFluxoNo.update({
          where: { id: dbId },
          data: { nextIds: resolvedNext.length ? resolvedNext : n.nextIds.filter((x) => all.some((a) => a.id === x)) },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
