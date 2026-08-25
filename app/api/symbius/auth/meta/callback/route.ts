import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  getSession,
  limitsForPlan,
  setSessionCookie,
  uniqueOrgSlug,
} from "@/lib/symbius/auth";
import { canConnectIgAccount } from "@/lib/symbius/tenant";
import {
  completeInstagramLogin,
  getSymbiusAppUrl,
} from "@/lib/instagram/metaOAuth";

type OAuthState = {
  intent?: "auth" | "connect";
  organizationId?: string;
  userId?: string;
  returnTo?: string;
  popup?: boolean;
};

type IgLoginResult = Awaited<ReturnType<typeof completeInstagramLogin>>;

function parseState(stateParam: string): OAuthState {
  try {
    return JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf8"),
    ) as OAuthState;
  } catch {
    return {};
  }
}

function syntheticEmail(igUserId: string) {
  return `ig_${igUserId}@users.symbius.local`;
}

function redirectAuthError(base: string, error: string) {
  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent(error)}`,
  );
}

function redirectAfterAuth(
  base: string,
  decoded: OAuthState,
  params: { error?: string },
) {
  const returnTo = decoded.returnTo ?? "/app";

  if (decoded.popup) {
    const sp = new URLSearchParams();
    if (params.error) {
      sp.set("error", params.error);
    } else {
      sp.set("ok", "1");
      sp.set("returnTo", returnTo);
    }
    return NextResponse.redirect(
      `${base}/login/oauth-complete?${sp.toString()}`,
    );
  }

  if (params.error) {
    return redirectAuthError(base, params.error);
  }

  return NextResponse.redirect(`${base}${returnTo}`);
}

function redirectAfterConnect(
  base: string,
  decoded: OAuthState,
  params: { step?: string; error?: string },
) {
  if (decoded.popup) {
    const sp = new URLSearchParams();
    if (params.error) {
      sp.set("error", params.error);
    } else {
      sp.set("ok", "1");
      if (params.step) sp.set("step", params.step);
    }
    return NextResponse.redirect(
      `${base}/app/connect/oauth-complete?${sp.toString()}`,
    );
  }

  if (params.error) {
    return NextResponse.redirect(
      `${base}/app/connect?error=${encodeURIComponent(params.error)}`,
    );
  }

  const returnTo = decoded.returnTo ?? "/app/connect";
  return NextResponse.redirect(
    `${base}${returnTo}?step=${params.step ?? "5"}`,
  );
}

async function upsertIgAccountForOrg(
  organizationId: string,
  result: IgLoginResult,
) {
  await prisma.igAccount.upsert({
    where: {
      organizationId_igUserId: {
        organizationId,
        igUserId: result.profile.igUserId,
      },
    },
    create: {
      organizationId,
      pageName: result.profile.name ?? null,
      accessToken: result.accessToken,
      igUserId: result.profile.igUserId,
      igUsername: result.profile.username,
      igProfilePictureUrl: result.profile.profilePictureUrl,
      followersCount: result.profile.followersCount,
      scopes: result.scopes,
      status: "CONNECTED",
      messagesEnabled: result.messagesEnabled,
      tokenExpiresAt: result.expiresAt,
      webhookSubscribedAt: new Date(),
    },
    update: {
      pageName: result.profile.name ?? null,
      accessToken: result.accessToken,
      igUsername: result.profile.username,
      igProfilePictureUrl: result.profile.profilePictureUrl,
      followersCount: result.profile.followersCount,
      scopes: result.scopes,
      status: "CONNECTED",
      messagesEnabled: result.messagesEnabled,
      tokenExpiresAt: result.expiresAt,
      webhookSubscribedAt: new Date(),
    },
  });
}

async function issueSessionForUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const membership = user.memberships[0];
  if (!membership || membership.organization.status !== "ACTIVE") {
    throw new Error("Conta suspensa");
  }

  const token = await createSessionToken({
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    email: user.email,
    nome: user.nome,
  });
  await setSessionCookie(token);

  return membership.organizationId;
}

async function handleAuthIntent(
  base: string,
  decoded: OAuthState,
  result: IgLoginResult,
): Promise<NextResponse> {
  const igUserId = result.profile.igUserId;
  const profile = result.profile;

  // 1) User já ligado a este IG
  let user = await prisma.user.findUnique({
    where: { igUserId },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  // 2) IgAccount existente → login na org dona
  if (!user) {
    const existingAccount = await prisma.igAccount.findFirst({
      where: { igUserId },
      orderBy: { createdAt: "asc" },
      include: {
        organization: {
          include: {
            members: {
              where: { role: "OWNER" },
              take: 1,
              include: { user: true },
            },
          },
        },
      },
    });

    if (existingAccount?.organization.members[0]?.user) {
      const owner = existingAccount.organization.members[0].user;
      user = await prisma.user.update({
        where: { id: owner.id },
        data: { igUserId },
        include: {
          memberships: {
            include: { organization: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });
    }
  }

  if (user) {
    const orgId = user.memberships[0]?.organizationId;
    if (!orgId) throw new Error("Usuário sem organização");

    await upsertIgAccountForOrg(orgId, result);
    await issueSessionForUser(user.id);
    return redirectAfterAuth(base, decoded, {});
  }

  // 3) Novo usuário: User + Org + IgAccount
  const displayName =
    profile.name?.trim() ||
    (profile.username ? `@${profile.username}` : "Conta Instagram");
  const orgNome = profile.username
    ? `@${profile.username}`
    : displayName;
  const slug = await uniqueOrgSlug(profile.username || displayName);
  const limits = limitsForPlan("FREE");
  const email = syntheticEmail(igUserId);

  const created = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        nome: displayName,
        igUserId,
        passwordHash: null,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                nome: orgNome,
                slug,
                plan: "FREE",
                onboardingDone: true,
                maxIgAccounts: limits.maxIgAccounts,
                maxFluxos: limits.maxFluxos,
                maxMembers: limits.maxMembers,
                subscription: { create: { plan: "FREE" } },
              },
            },
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    const organizationId = newUser.memberships[0].organizationId;

    await tx.igAccount.create({
      data: {
        organizationId,
        pageName: profile.name ?? null,
        accessToken: result.accessToken,
        igUserId,
        igUsername: profile.username,
        igProfilePictureUrl: profile.profilePictureUrl,
        followersCount: profile.followersCount,
        scopes: result.scopes,
        status: "CONNECTED",
        messagesEnabled: result.messagesEnabled,
        tokenExpiresAt: result.expiresAt,
        webhookSubscribedAt: new Date(),
      },
    });

    return newUser;
  });

  await issueSessionForUser(created.id);
  return redirectAfterAuth(base, decoded, {});
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error =
    searchParams.get("error_description") ??
    searchParams.get("error_reason") ??
    searchParams.get("error");

  const base = getSymbiusAppUrl();
  const decoded = stateParam ? parseState(stateParam) : {};
  const isAuth = decoded.intent === "auth";

  if (error) {
    const msg = String(error).replace(/\+/g, " ");
    if (isAuth) return redirectAfterAuth(base, decoded, { error: msg });
    return redirectAfterConnect(base, decoded, { error: msg });
  }

  const jar = await cookies();
  const savedState = jar.get("symbius_meta_oauth_state")?.value;
  jar.delete("symbius_meta_oauth_state");

  if (!code || !stateParam || stateParam !== savedState) {
    if (isAuth) {
      return redirectAfterAuth(base, decoded, {
        error: "Sessão OAuth inválida",
      });
    }
    return redirectAfterConnect(base, decoded, {
      error: "Sessão OAuth inválida",
    });
  }

  try {
    const result = await completeInstagramLogin(code);

    if (isAuth) {
      return await handleAuthIntent(base, decoded, result);
    }

    // --- connect (logado) ---
    const session = await getSession();
    const organizationId = session?.organizationId ?? decoded.organizationId;
    if (!organizationId) {
      return redirectAfterConnect(base, decoded, {
        error: "Não autenticado",
      });
    }

    const already = await prisma.igAccount.findUnique({
      where: {
        organizationId_igUserId: {
          organizationId,
          igUserId: result.profile.igUserId,
        },
      },
      select: { id: true },
    });

    if (!already && !(await canConnectIgAccount(organizationId))) {
      return redirectAfterConnect(base, decoded, {
        error: "Limite de contas Instagram do plano atingido",
      });
    }

    await upsertIgAccountForOrg(organizationId, result);

    // Liga igUserId ao user logado se ainda não tiver
    if (session?.userId) {
      await prisma.user.updateMany({
        where: { id: session.userId, igUserId: null },
        data: { igUserId: result.profile.igUserId },
      });
    }

    return redirectAfterConnect(base, decoded, { step: "5" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro OAuth";
    if (isAuth) return redirectAfterAuth(base, decoded, { error: msg });
    return redirectAfterConnect(base, decoded, { error: msg });
  }
}
