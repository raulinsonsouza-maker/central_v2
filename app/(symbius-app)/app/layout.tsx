import "../../symbius.css";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/symbius/auth";
import { prisma } from "@/lib/db";
import { SymbiusAppShell } from "@/components/symbius/SymbiusAppShell";

export default async function SymbiusAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { onboardingDone: true },
  });

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const skipOnboarding =
    pathname.includes("/onboarding") || pathname.includes("/connect");

  if (org && !org.onboardingDone && !skipOnboarding) {
    redirect("/app/onboarding");
  }

  return (
    <SymbiusAppShell userName={session.nome}>{children}</SymbiusAppShell>
  );
}
