"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LayoutDashboard, Settings } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const isAdminClientes = pathname.startsWith("/admin/clientes");
  const isAdminConfig = pathname.startsWith("/admin/configuracoes");
  const isGestao = pathname.startsWith("/gestao");
  const isPortal = pathname.startsWith("/portal");

  if (isPortal) return null;

  const iconClass = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
      active
        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
        : "text-[var(--foreground)]/80 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)]/60 bg-[var(--background)]/96 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/Images/cropped-logo-inout-branco-1.webp"
            alt="Inout"
            width={120}
            height={38}
            className="h-8 w-auto object-contain"
          />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/gestao"
            title="Painel de gestão"
            className={iconClass(isGestao)}
          >
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link
            href="/admin/clientes"
            title="Configurações de clientes"
            className={iconClass(isAdminClientes)}
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link
            href="/admin/configuracoes"
            title="Tokens de API (Google e Meta)"
            className={iconClass(isAdminConfig)}
          >
            <KeyRound className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
