import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/symbius/auth";
import { getActiveIgAccountId } from "@/lib/symbius/activeIgAccount";
import {
  isWithin24hWindow,
  sendInstagramMessage,
} from "@/lib/instagram/messagingClient";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status"); // OPEN | CLOSED | all
  const unreadOnly = searchParams.get("unread") === "1";
  const tag = searchParams.get("tag");
  const assignedUserId = searchParams.get("assignedUserId");
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const activeIg = await getActiveIgAccountId(session.organizationId);

  const conversas = await prisma.igConversa.findMany({
    where: {
      organizationId: session.organizationId,
      ...(activeIg ? { igAccountId: activeIg } : {}),
      ...(status && status !== "all" ? { status } : {}),
      ...(assignedUserId ? { assignedUserId } : {}),
      ...(tag ? { contato: { tags: { has: tag } } } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 150,
    include: {
      contato: true,
      mensagens: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  let mapped = conversas.map((c) => {
    const last = c.mensagens[0];
    const unread = last?.direction === "INBOUND";
    return {
      id: c.id,
      status: c.status,
      handoffHuman: c.handoffHuman,
      assignedUserId: c.assignedUserId,
      unread,
      contato: {
        id: c.contato.id,
        nome: c.contato.nome,
        username: c.contato.username,
        igsid: c.contato.igsid,
        tags: c.contato.tags,
        botPaused: c.contato.botPaused,
        lastInteractionAt: c.contato.lastInteractionAt,
      },
      lastMessage: last?.texto ?? "",
      lastDirection: last?.direction ?? null,
      lastMessageAt: c.lastMessageAt,
    };
  });

  if (unreadOnly) {
    mapped = mapped.filter((c) => c.unread);
  }
  if (q) {
    mapped = mapped.filter((c) => {
      const hay = [
        c.contato.username,
        c.contato.nome,
        c.lastMessage,
        ...c.contato.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json({
    conversas: mapped,
    counts: {
      all: conversas.length,
      open: conversas.filter((c) => c.status === "OPEN").length,
      unread: mapped.filter((c) => c.unread).length,
      handoff: conversas.filter((c) => c.handoffHuman).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    conversaId: string;
    text: string;
    scheduledAt?: string;
  };

  if (body.scheduledAt) {
    const scheduled = await prisma.igScheduledMessage.create({
      data: {
        organizationId: session.organizationId,
        conversaId: body.conversaId,
        texto: body.text,
        scheduledAt: new Date(body.scheduledAt),
        sentByUserId: session.userId,
      },
    });
    return NextResponse.json({ scheduled });
  }

  const conversa = await prisma.igConversa.findFirst({
    where: {
      id: body.conversaId,
      organizationId: session.organizationId,
    },
    include: {
      contato: { include: { igAccount: true } },
    },
  });

  if (!conversa) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const within24h = isWithin24hWindow(conversa.contato.lastInteractionAt);
  const tag = within24h ? undefined : ("HUMAN_AGENT" as const);

  if (!within24h && session.role === "AGENT") {
    return NextResponse.json(
      { error: "Janela de 24h expirada — apenas humanos podem responder" },
      { status: 403 },
    );
  }

  const sent = await sendInstagramMessage({
    igUserId: conversa.contato.igAccount.igUserId,
    accessToken: conversa.contato.igAccount.accessToken,
    recipientIgsid: conversa.contato.igsid,
    text: body.text,
    tag,
  });

  const msg = await prisma.igMensagem.create({
    data: {
      organizationId: session.organizationId,
      conversaId: conversa.id,
      direction: "OUTBOUND",
      mid: sent.message_id,
      texto: body.text,
      isEcho: false,
      sentByUserId: session.userId,
      tag: tag ?? null,
    },
  });

  await prisma.igConversa.update({
    where: { id: conversa.id },
    data: { lastMessageAt: new Date(), status: "OPEN" },
  });

  return NextResponse.json({ message: msg });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    conversaId: string;
    status?: string;
    handoffHuman?: boolean;
    botPaused?: boolean;
    assignedUserId?: string | null;
    fluxoId?: string;
  };

  const conversa = await prisma.igConversa.findFirst({
    where: {
      id: body.conversaId,
      organizationId: session.organizationId,
    },
  });
  if (!conversa) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  await prisma.igConversa.update({
    where: { id: conversa.id },
    data: {
      status: body.status,
      handoffHuman: body.handoffHuman,
      assignedUserId: body.assignedUserId,
    },
  });

  if (typeof body.botPaused === "boolean") {
    await prisma.igContato.update({
      where: { id: conversa.contatoId },
      data: { botPaused: body.botPaused },
    });
  }

  if (body.fluxoId) {
    const { triggerManualFluxo } = await import("@/lib/symbius/manualFluxo");
    await triggerManualFluxo({
      organizationId: session.organizationId,
      fluxoId: body.fluxoId,
      contatoId: conversa.contatoId,
      context: { manual: true, fromInbox: true },
    });
  }

  return NextResponse.json({ ok: true });
}
