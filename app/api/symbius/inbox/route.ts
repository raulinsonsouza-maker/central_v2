import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/symbius/auth";
import {
  isWithin24hWindow,
  sendInstagramMessage,
} from "@/lib/instagram/messagingClient";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const conversas = await prisma.igConversa.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      contato: true,
      mensagens: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    conversas: conversas.map((c) => ({
      id: c.id,
      contato: {
        id: c.contato.id,
        nome: c.contato.nome,
        username: c.contato.username,
        igsid: c.contato.igsid,
        lastInteractionAt: c.contato.lastInteractionAt,
      },
      handoffHuman: c.handoffHuman,
      lastMessage: c.mensagens[0]?.texto ?? "",
      lastMessageAt: c.lastMessageAt,
    })),
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
  };

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
    pageAccessToken: conversa.contato.igAccount.pageAccessToken,
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
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({ message: msg });
}
