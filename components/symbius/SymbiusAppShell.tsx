"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plug,
  Settings,
  Workflow,
} from "lucide-react";
import { SymbiusLogo } from "./SymbiusLogo";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/connect", label: "Conectar Instagram", icon: Plug },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/flows", label: "Fluxos", icon: Workflow },
  { href: "/app/contacts", label: "Contatos", icon: MessageSquare },
  { href: "/app/settings", label: "Configurações", icon: Settings },
];

export function SymbiusAppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="symbius-theme flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-[var(--symbius-border)] bg-[var(--symbius-surface)] md:flex">
        <div className="border-b border-[var(--symbius-border)] p-4">
          <SymbiusLogo size="sm" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--symbius-primary)]/15 text-white"
                    : "text-[var(--symbius-muted)] hover:bg-[var(--symbius-surface-hover)] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--symbius-border)] p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <form action="/api/symbius/auth/logout" method="POST">
            <button
              type="submit"
              className="mt-2 flex items-center gap-2 text-sm text-[var(--symbius-muted)] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
