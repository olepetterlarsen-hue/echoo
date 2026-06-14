"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Grid3x3, BookCheck, Upload } from "lucide-react";

interface Props {
  canManageAll: boolean;
}

interface TabItem {
  href: string;
  label: string;
  icon: typeof Award;
  adminOnly?: boolean;
}

const ITEMS: TabItem[] = [
  { href: "/kompetanse", label: "Sertifikater", icon: Award },
  { href: "/kompetanse/matrise", label: "Kursmatrise", icon: Grid3x3, adminOnly: true },
  { href: "/kompetanse/kurs-krav", label: "Påkrevde kurs", icon: BookCheck, adminOnly: true },
  { href: "/kompetanse/import", label: "Importer", icon: Upload, adminOnly: true },
];

export function KompetanseTabNav({ canManageAll }: Props) {
  const pathname = usePathname() ?? "";
  return (
    <div className="flex border-b border-border gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        if (item.adminOnly && !canManageAll) return null;
        // Eksakt match for /kompetanse, prefix-match for sub-routes
        const active =
          item.href === "/kompetanse"
            ? pathname === "/kompetanse"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap ${
              active
                ? "border-orange text-orange"
                : "border-transparent text-text-2 hover:text-text-1"
            }`}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
