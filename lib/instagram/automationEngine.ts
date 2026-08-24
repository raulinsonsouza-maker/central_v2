import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  isWithin24hWindow,
  sendInstagramMessage,
} from "./messagingClient";

type WebhookMessaging = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
  postback?: { title?: string; payload?: string };
};

type WebhookEntry = {
  id: string;
  messaging?: WebhookMessaging[];
  changes?: Array<{
    field: string;
    value: {
      id?: string;
      text?: string;
      from?: { id: string; username?: string };
      media?: { id: string };
    };
  }>;
};

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

async function getOrCreateContato(
  organizationId: string,
  igAccountId: string,
  igsid: string,
  nome?: string,
  username?: string,
) {
  const existing = await prisma.igContato.findUnique({
    where: { igAccountId_igsid: { igAccountId, igsid } },
  });
  if (existing) {
    return prisma.igContato.update({
      where: { id: existing.id },
      data: {
        lastInteractionAt: new Date(),
        nome: nome ?? existing.nome,
        username: username ?? existing.username,
      },
    });
  }
  return prisma.igContato.create({
    data: {
      organizationId,
      igAccountId,
      igsid,
      nome,
      username,
      lastInteractionAt: new Date(),
    },
  });
}

async function getOrCreateConversa(
  organizationId: string,
  igAccountId: string,
  contatoId: string,
) {
  const open = await prisma.igConversa.findFirst({
    where: { contatoId, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
  });
  if (open) return open;
  return prisma.igConversa.create({
    data: {
      organizationId,
      igAccountId,
      contatoId,
      status: "OPEN",
      lastMessageAt: new Date(),
    },
  });
}

async function persistInboundMessage(
  organizationId: string,
  conversaId: string,
  mid: string | undefined,
  texto: string | undefined,
  isEcho: boolean,
) {
  if (mid) {
    const dup = await prisma.igMensagem.findUnique({ where: { mid } });
    if (dup) return dup;
  }
  return prisma.igMensagem.create({
    data: {
      organizationId,
      conversaId,
      direction: isEcho ? "OUTBOUND" : "INBOUND",
      mid: mid ?? undefined,
      texto,
      isEcho,
    },
  });
}

async function runFluxoFromNode(
  execucaoId: string,
  noId: string,
): Promise<void> {
  const exec = await prisma.igFluxoExecucao.findUniqueOrThrow({
    where: { id: execucaoId },
    include: {
      contato: { include: { igAccount: true } },
      fluxo: { include: { nos: true } },
    },
  });

  if (exec.status !== "RUNNING" && exec.status !== "WAITING") return;
  if (exec.contato.botPaused || exec.contato.igAccount.status !== "CONNECTED") {
    await prisma.igFluxoExecucao.update({
      where: { id: execucaoId },
      data: { status: "CANCELLED" },
    });
    return;
  }

  const no = exec.fluxo.nos.find((n) => n.id === noId);
  if (!no) {
    await prisma.igFluxoExecucao.update({
      where: { id: execucaoId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  const config = no.config as Record<string, unknown>;

  switch (no.tipo) {
    case "send_message": {
      const text = String(config.text ?? "");
      if (text && isWithin24hWindow(exec.contato.lastInteractionAt)) {
        const sent = await sendInstagramMessage({
          igUserId: exec.contato.igAccount.igUserId,
          pageAccessToken: exec.contato.igAccount.pageAccessToken,
          recipientIgsid: exec.contato.igsid,
          text,
        });
        const conversa = await getOrCreateConversa(
          exec.organizationId,
          exec.contato.igAccountId,
          exec.contatoId,
        );
        await persistInboundMessage(
          exec.organizationId,
          conversa.id,
          sent.message_id,
          text,
          true,
        );
      }
      break;
    }
    case "wait": {
      const minutes = Number(config.minutes ?? 0);
      await prisma.igFluxoExecucao.update({
        where: { id: execucaoId },
        data: {
          status: "WAITING",
          noAtualId: noId,
          scheduledAt: new Date(Date.now() + minutes * 60 * 1000),
        },
      });
      return;
    }
    case "add_tag": {
      const tag = String(config.tag ?? "");
      if (tag) {
        const contato = exec.contato;
        const tags = new Set(contato.tags);
        tags.add(tag);
        await prisma.igContato.update({
          where: { id: contato.id },
          data: { tags: Array.from(tags) },
        });
      }
      break;
    }
    case "handoff_human": {
      await prisma.igContato.update({
        where: { id: exec.contatoId },
        data: { botPaused: true },
      });
      const conversa = await getOrCreateConversa(
        exec.organizationId,
        exec.contato.igAccountId,
        exec.contatoId,
      );
      await prisma.igConversa.update({
        where: { id: conversa.id },
        data: { handoffHuman: true },
      });
      await prisma.igFluxoExecucao.update({
        where: { id: execucaoId },
        data: { status: "COMPLETED" },
      });
      return;
    }
    case "condition": {
      const field = String(config.field ?? "text");
      const op = String(config.operator ?? "contains");
      const value = normalizeText(String(config.value ?? ""));
      const ctx = exec.context as Record<string, unknown>;
      const actual = normalizeText(String(ctx[field] ?? ""));
      let ok = false;
      if (op === "equals") ok = actual === value;
      else if (op === "contains") ok = actual.includes(value);
      const nextId = ok ? no.nextIds[0] : no.nextIds[1];
      if (nextId) {
        await prisma.igFluxoExecucao.update({
          where: { id: execucaoId },
          data: { noAtualId: nextId, status: "RUNNING", scheduledAt: null },
        });
        await runFluxoFromNode(execucaoId, nextId);
      } else {
        await prisma.igFluxoExecucao.update({
          where: { id: execucaoId },
          data: { status: "COMPLETED" },
        });
      }
      return;
    }
    default:
      break;
  }

  const nextId = no.nextIds[0];
  if (nextId) {
    await prisma.igFluxoExecucao.update({
      where: { id: execucaoId },
      data: { noAtualId: nextId, status: "RUNNING", scheduledAt: null },
    });
    await runFluxoFromNode(execucaoId, nextId);
  } else {
    await prisma.igFluxoExecucao.update({
      where: { id: execucaoId },
      data: { status: "COMPLETED" },
    });
  }
}

async function startFluxo(
  fluxoId: string,
  contatoId: string,
  organizationId: string,
  context: Record<string, unknown>,
) {
  const fluxo = await prisma.igFluxo.findFirst({
    where: { id: fluxoId, organizationId, status: "PUBLISHED" },
    include: { nos: true },
  });
  if (!fluxo || fluxo.nos.length === 0) return;

  const start =
    fluxo.nos.find((n) => n.tipo === "trigger") ?? fluxo.nos[0];
  const nextId = start.nextIds[0];
  if (!nextId) return;

  const exec = await prisma.igFluxoExecucao.create({
    data: {
      organizationId,
      fluxoId: fluxo.id,
      contatoId,
      noAtualId: nextId,
      status: "RUNNING",
      context: context as object,
    },
  });
  await runFluxoFromNode(exec.id, nextId);
}

function matchesTrigger(
  triggerType: string,
  triggerConfig: Record<string, unknown>,
  context: Record<string, unknown>,
): boolean {
  const text = normalizeText(String(context.text ?? ""));
  if (triggerType === "welcome") {
    return Boolean(context.isFirstMessage);
  }
  if (triggerType === "keyword") {
    const keywords = (triggerConfig.keywords as string[] | undefined) ?? [];
    return keywords.some((k) => text.includes(normalizeText(k)));
  }
  if (triggerType === "comment_keyword") {
    const keywords = (triggerConfig.keywords as string[] | undefined) ?? [];
    const comment = normalizeText(String(context.commentText ?? ""));
    return keywords.some((k) => comment.includes(normalizeText(k)));
  }
  if (triggerType === "story_reply") {
    return Boolean(context.isStoryReply);
  }
  if (triggerType === "postback") {
    return (
      String(context.postbackPayload ?? "") ===
      String(triggerConfig.payload ?? "")
    );
  }
  return false;
}

export async function processAutomationForContato(
  organizationId: string,
  igAccountId: string,
  contatoId: string,
  context: Record<string, unknown>,
): Promise<void> {
  const contato = await prisma.igContato.findUnique({ where: { id: contatoId } });
  if (!contato || contato.botPaused) return;

  const fluxos = await prisma.igFluxo.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      OR: [{ igAccountId }, { igAccountId: null }],
    },
  });

  for (const fluxo of fluxos) {
    const cfg = fluxo.triggerConfig as Record<string, unknown>;
    if (matchesTrigger(fluxo.triggerType, cfg, context)) {
      await startFluxo(fluxo.id, contatoId, organizationId, context);
      break;
    }
  }
}

export async function processWebhookPayload(payload: unknown): Promise<void> {
  const body = payload as { object?: string; entry?: WebhookEntry[] };
  if (body.object !== "instagram" && body.object !== "page") return;

  for (const entry of body.entry ?? []) {
    const igUserId = entry.id;
    const igAccount = await prisma.igAccount.findFirst({
      where: { igUserId, status: "CONNECTED" },
    });
    if (!igAccount) continue;

    await prisma.igWebhookEvent.create({
      data: {
        organizationId: igAccount.organizationId,
        igUserId,
        payload: body as object,
      },
    });

    for (const msg of entry.messaging ?? []) {
      const igsid = msg.sender?.id;
      if (!igsid || igsid === igUserId) continue;

      const isEcho = Boolean(msg.message?.is_echo);
      if (isEcho) continue;

      const contato = await getOrCreateContato(
        igAccount.organizationId,
        igAccount.id,
        igsid,
      );
      const conversa = await getOrCreateConversa(
        igAccount.organizationId,
        igAccount.id,
        contato.id,
      );

      const texto = msg.message?.text ?? msg.postback?.title;
      await persistInboundMessage(
        igAccount.organizationId,
        conversa.id,
        msg.message?.mid,
        texto,
        false,
      );

      await prisma.igConversa.update({
        where: { id: conversa.id },
        data: { lastMessageAt: new Date() },
      });

      const priorCount = await prisma.igMensagem.count({
        where: { conversaId: conversa.id, direction: "INBOUND" },
      });

      await processAutomationForContato(
        igAccount.organizationId,
        igAccount.id,
        contato.id,
        {
          text: msg.message?.text ?? "",
          postbackPayload: msg.postback?.payload ?? "",
          isFirstMessage: priorCount <= 1,
          isStoryReply: false,
        },
      );
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const commentText = change.value.text ?? "";
      const fromId = change.value.from?.id;
      if (!fromId) continue;

      const contato = await getOrCreateContato(
        igAccount.organizationId,
        igAccount.id,
        fromId,
        undefined,
        change.value.from?.username,
      );

      await processAutomationForContato(
        igAccount.organizationId,
        igAccount.id,
        contato.id,
        {
          commentText,
          text: "",
          isFirstMessage: false,
        },
      );
    }
  }
}

export async function processScheduledExecutions(): Promise<number> {
  const due = await prisma.igFluxoExecucao.findMany({
    where: {
      status: "WAITING",
      scheduledAt: { lte: new Date() },
    },
    take: 50,
  });

  for (const exec of due) {
    if (exec.noAtualId) {
      await prisma.igFluxoExecucao.update({
        where: { id: exec.id },
        data: { status: "RUNNING" },
      });
      await runFluxoFromNode(exec.id, exec.noAtualId);
    }
  }
  return due.length;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const appSecret =
    process.env.SYMBIUS_META_APP_SECRET ?? process.env.META_APP_SECRET ?? "";
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) {
    return process.env.NODE_ENV !== "production";
  }
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.slice(7);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex"),
    );
  } catch {
    return false;
  }
}
