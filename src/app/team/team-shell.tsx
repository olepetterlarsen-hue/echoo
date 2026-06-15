"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  UserCog,
  LogOut,
  Menu,
  X,
  ArrowRightLeft,
} from "lucide-react";

interface StaffUser {
  full_name: string | null;
  email: string;
  organization_id: string | null;
}

const NAV = [
  { href: "/team", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/team/kunder", label: "Kunder", icon: Users },
  { href: "/team/salg", label: "Salg", icon: TrendingUp },
  { href: "/team/staff", label: "Internt team", icon: UserCog },
];

export function TeamShell({
  user,
  children,
}: {
  user: StaffUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-surface border-r border-border flex flex-col transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Link href="/team" className="flex items-center gap-2">
            <Image
              src="/echoo-wordmark.svg"
              alt="Echoo"
              width={80}
              height={22}
            />
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange/15 text-orange border border-orange/30 font-semibold tracking-wider">
              TEAM
            </span>
          </Link>
          <button
            className="lg:hidden text-text-3 hover:text-text-1"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-orange/15 text-orange"
                    : "text-text-2 hover:bg-card hover:text-text-1"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-border space-y-1">
          {user.organization_id && (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-xs text-text-3 hover:bg-card hover:text-text-1 transition-colors"
            >
              <ArrowRightLeft className="size-3.5" />
              Tilbake til kunde-app
            </Link>
          )}
          <div className="px-3 py-2 text-xs text-text-3">
            <div className="font-medium text-text-2 truncate">
              {user.full_name ?? user.email}
            </div>
            <div className="truncate text-[11px]">{user.email}</div>
          </div>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-3 hover:bg-card hover:text-text-1 transition-colors"
            >
              <LogOut className="size-4" />
              Logg ut
            </button>
          </form>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-text-2 hover:text-text-1"
          >
            <Menu className="size-5" />
          </button>
          <Image src="/echoo-wordmark.svg" alt="Echoo" width={80} height={22} />
          <div className="w-5" />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
