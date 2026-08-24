import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/symbius/auth";
import { canConnectIgAccount } from "@/lib/symbius/tenant";
import {
  fetchIgProfile,
  subscribePageWebhooks,
  verifyMessagingAccess,
} from "@/lib/instagram/metaOAuth";

const schema = z.object({ pageId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Page inválida" }, { status: 400 });
  }

  if (!(await canConnectIgAccount(session.organizationId))) {
    return NextResponse.json(
      { error: "Limite de contas Instagram do plano atingido" },
      { status: 403 },
    );
  }

  const jar = await cookies();
  const raw = jar.get("symbius_meta_pages")?.value;
  if (!raw) {
    return NextResponse.json({ error: "Sessão Meta expirada" }, { status: 400 });
  }

  const { pages } = JSON.parse(
    Buffer.from(raw, "base64url").toString("utf8"),
  ) as {
    pages: Array<{
      pageId: string;
      pageName: string;
      pageAccessToken: string;
      igUserId: string | null;
      pictureUrl?: string;
    }>;
  };

  const page = pages.find((p) => p.pageId === parsed.data.pageId);
  if (!page?.igUserId) {
    return NextResponse.json(
      { error: "Page sem Instagram Professional vinculado" },
      { status: 400 },
    );
  }

  const profile = await fetchIgProfile(page.igUserId, page.pageAccessToken);
  await subscribePageWebhooks(page.pageId, page.pageAccessToken);
  const messagesEnabled = await verifyMessagingAccess(
    page.igUserId,
    page.pageAccessToken,
  );

  const account = await prisma.igAccount.upsert({
    where: {
      organizationId_igUserId: {
        organizationId: session.organizationId,
        igUserId: page.igUserId,
      },
    },
    create: {
      organizationId: session.organizationId,
      pageId: page.pageId,
      pageName: page.pageName,
      pageAccessToken: page.pageAccessToken,
      igUserId: page.igUserId,
      igUsername: profile.username,
      igProfilePictureUrl: profile.profile_picture_url,
      followersCount: profile.followers_count,
      status: "CONNECTED",
      messagesEnabled,
      webhookSubscribedAt: new Date(),
    },
    update: {
      pageId: page.pageId,
      pageName: page.pageName,
      pageAccessToken: page.pageAccessToken,
      igUsername: profile.username,
      igProfilePictureUrl: profile.profile_picture_url,
      followersCount: profile.followers_count,
      status: "CONNECTED",
      messagesEnabled,
      webhookSubscribedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      igUsername: account.igUsername,
      messagesEnabled: account.messagesEnabled,
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const jar = await cookies();
  const raw = jar.get("symbius_meta_pages")?.value;
  if (!raw) {
    return NextResponse.json({ pages: [] });
  }

  const { pages } = JSON.parse(
    Buffer.from(raw, "base64url").toString("utf8"),
  ) as { pages: unknown[] };

  return NextResponse.json({ pages });
}
