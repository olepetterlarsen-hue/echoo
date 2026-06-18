"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminTab {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  tabs: AdminTab[];
}

/**
 * Horisontale faner for admin-sider som tidligere var separate sidebar-
 * knapper. usePathname avgjør aktiv fane — vi sjekker både eksakt match og
 * prefix-match slik at /admin/grupper/ny også markerer Grupper-fanen aktiv.
 */
export function AdminTabs({ tabs }: Props) {
  const pathname = usePathname() ?? "";
  return (
    <div className="border-b border-border -mb-px overflow-x-auto">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-orange text-orange"
                  : "border-transparent text-text-2 hover:text-text-1 hover:border-border"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
