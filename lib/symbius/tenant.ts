import { prisma } from "@/lib/db";
import type { SymbiusSession } from "./auth";

export async function getOrganizationForSession(session: SymbiusSession) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: session.organizationId },
    include: {
      igAccounts: { where: { status: "CONNECTED" }, orderBy: { createdAt: "desc" } },
      subscription: true,
      _count: { select: { fluxos: true, members: true } },
    },
  });
}

export async function assertOrgAccess(
  session: SymbiusSession,
  minRole: "AGENT" | "ADMIN" | "OWNER" = "AGENT",
): Promise<void> {
  const rank = { AGENT: 1, ADMIN: 2, OWNER: 3 } as const;
  if (rank[session.role as keyof typeof rank] < rank[minRole]) {
    throw new Error("FORBIDDEN");
  }
}

export async function canConnectIgAccount(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { _count: { select: { igAccounts: true } } },
  });
  return org._count.igAccounts < org.maxIgAccounts;
}

export async function canPublishFluxo(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const published = await prisma.igFluxo.count({
    where: { organizationId, status: "PUBLISHED" },
  });
  return published < org.maxFluxos;
}
