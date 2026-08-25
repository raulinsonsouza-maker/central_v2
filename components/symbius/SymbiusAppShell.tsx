"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Atom,
  BarChart2,
  CircleHelp,
  Home,
  MessageCircle,
  PanelLeft,
  Settings,
  UserRound,
} from "lucide-react";
import type { SymbiusShellData } from "@/lib/symbius/shellData";
import { AccountSwitcher } from "@/components/symbius/AccountSwitcher";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  badge?: number;
};

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`symbius-nav-item ${active ? "symbius-nav-item-active" : ""} ${
        collapsed ? "symbius-nav-item-collapsed" : ""
      }`}
    >
      <Icon className="symbius-nav-icon" strokeWidth={1.5} />
      {!collapsed && <span className="symbius-nav-label">{item.label}</span>}
      {!collapsed && item.badge != null && item.badge > 0 ? (
        <span className="symbius-nav-badge">{item.badge}</span>
      ) : null}
      {collapsed && item.badge != null && item.badge > 0 ? (
        <span className="symbius-nav-badge-dot" />
      ) : null}
    </Link>
  );
}

export function SymbiusAppShell({
  children,
  shell,
}: {
  children: React.ReactNode;
  shell: SymbiusShellData;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const nav: NavItem[] = [
    { href: "/app", label: "Inicial", icon: Home, exact: true },
    { href: "/app/contacts", label: "Contatos", icon: UserRound },
    { href: "/app/flows", label: "Automação", icon: Atom },
    { href: "/app/inbox", label: "Caixa de Entrada", icon: MessageCircle, badge: shell.inboxUnread },
    { href: "/app/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/app/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="symbius-app-shell">
      <aside
        className={`symbius-sidebar ${collapsed ? "symbius-sidebar-collapsed" : ""}`}
      >
        <div className="symbius-sidebar-header">
          <Link href="/app" className="symbius-sidebar-logo">
            {collapsed ? (
              <span className="symbius-sidebar-logo-mark">S</span>
            ) : (
              <span className="symbius-sidebar-logo-word">Symbius</span>
            )}
          </Link>

          <AccountSwitcher shell={shell} collapsed={collapsed} />

          {!collapsed && <div className="symbius-header-divider" />}
        </div>

        <nav className="symbius-sidebar-nav">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        <div className="symbius-sidebar-bottom">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="symbius-sidebar-collapse"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>

          <div className="symbius-sidebar-divider" />

          <div className="symbius-sidebar-footer">
            <Link
              href="/app/settings"
              className="symbius-sidebar-footer-link"
              title={collapsed ? "Meu perfil" : undefined}
            >
              <UserRound className="h-5 w-5" strokeWidth={1.5} />
              {!collapsed && <span>Meu perfil</span>}
            </Link>

            <a
              href="https://symbius.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="symbius-sidebar-footer-link"
              title={collapsed ? "Ajuda" : undefined}
            >
              <CircleHelp className="h-5 w-5" strokeWidth={1.5} />
              {!collapsed && <span>Ajuda</span>}
            </a>
          </div>
        </div>
      </aside>

      <main className="symbius-main">{children}</main>
    </div>
  );
}
