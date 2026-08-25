import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  limitsForPlan,
  setSessionCookie,
  uniqueOrgSlug,
} from "@/lib/symbius/auth";
import { isSession, requireApiSession } from "@/lib/symbius/apiHelpers";

export async function GET() {
  const session = await requireApiSession();
  if (!isSession(session)) return session;

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.userId },
    include: {
      organization: {
        include: {
          igAccounts: {
            where: { status: "CONNECTED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ pinnedAt: "desc" }, { createdAt: "asc" }],
  });

  const workspaces = await Promise.all(
    memberships.map(async (m) => {
      const ig = m.organization.igAccounts[0];
      const unread = await prisma.igConversa.count({
        where: {
          organizationId: m.organizationId,
          status: "OPEN",
          mensagens: { some: { direction: "INBOUND" } },
        },
      });
      return {
        id: m.organizationId,
        nome: m.organization.nome,
        plan: m.organization.plan,
        role: m.role,
        pinned: Boolean(m.pinnedAt),
        isActive: m.organizationId === session.organizationId,
        igUsername: ig?.igUsername ?? null,
        igProfilePictureUrl: ig?.igProfilePictureUrl ?? null,
        inboxUnread: unread,
      };
    }),
  );

  return NextResponse.json({ workspaces });
}

const createSchema = z.object({
  nome: z.string().min(2).max(80),
});

export async function POST(request: NextRequest) {
  const session = await requireApiSession("OWNER");
  if (!isSession(session)) return session;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
  }

  const slug = await uniqueOrgSlug(parsed.data.nome);
  const limits = limitsForPlan("FREE");

  const org = await prisma.organization.create({
    data: {
      nome: parsed.data.nome,
      slug,
      plan: "FREE",
      maxIgAccounts: limits.maxIgAccounts,
      maxFluxos: limits.maxFluxos,
      maxMembers: limits.maxMembers,
      members: {
        create: { userId: session.userId, role: "OWNER" },
      },
      subscription: { create: { plan: "FREE" } },
      orgSettings: { create: {} },
    },
  });

  const token = await createSessionToken({
    userId: session.userId,
    organizationId: org.id,
    role: "OWNER",
    email: session.email,
    nome: session.nome,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, organizationId: org.id });
}
