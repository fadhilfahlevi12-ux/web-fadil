"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { Role } from "@/db/schema";
import { logout } from "@/lib/actions/auth";
import { ROLE_META } from "@/lib/navigation";
import type { RoleNavGroup, RoleNavItem } from "@/lib/navigation";
import { ICONS } from "@/components/icons";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { cx } from "@/components/ui";

type AppShellProps = {
  children: ReactNode;
  role: Role;
  userName: string;
  userEmail: string;
  navGroups: RoleNavGroup[];
  notifications: NotificationItem[];
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: RoleNavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.icon];
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
          active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function SidebarBody({
  role,
  userName,
  userEmail,
  navGroups,
  pathname,
  onNavigate,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  navGroups: RoleNavGroup[];
  pathname: string;
  onNavigate: () => void;
}) {
  const meta = ROLE_META[role];
  const initial = initialsOf(userName);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-sm">
          S
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold text-white">SIMAP</p>
          <p className="text-[11px] text-slate-400">TI UMPAR</p>
        </div>
      </div>

      {/* Role */}
      <div className="border-b border-slate-800 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {meta.label}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={active}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="shrink-0 border-t border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">
            {initial || "?"}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>
            <p className="truncate text-xs text-slate-400">{userEmail}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
          >
            <ICONS.close className="h-4 w-4" />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  role,
  userName,
  userEmail,
  navGroups,
  notifications,
}: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-slate-900 lg:block">
        <SidebarBody
          role={role}
          userName={userName}
          userEmail={userEmail}
          navGroups={navGroups}
          pathname={pathname}
          onNavigate={close}
        />
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Drawer mobile */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-900 transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup menu"
          className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <ICONS.close className="h-5 w-5" />
        </button>
        <SidebarBody
          role={role}
          userName={userName}
          userEmail={userEmail}
          navGroups={navGroups}
          pathname={pathname}
          onNavigate={close}
        />
      </aside>

      {/* Konten utama */}
      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <ICONS.menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-bold text-slate-900">
                SIMAP TI UMPAR
              </p>
              <p className="text-[11px] text-slate-500">
                {ROLE_META[role].label}
              </p>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {ROLE_META[role].label}
              </span>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {userName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifikasi in-app (PRD §3A): lonceng berisi pembaruan per role. */}
            <NotificationBell
              items={notifications}
              dashboardHref={`/${role}`}
            />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-xs font-bold text-white lg:hidden">
              {initialsOf(userName) || "?"}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
