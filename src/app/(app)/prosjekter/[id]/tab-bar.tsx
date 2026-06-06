"use client";

import Link from "next/link";
import { Briefcase, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  projectId: string;
  active: "planlegging" | "kvalitet";
}

export function ProjectTabBar({ projectId, active }: Props) {
  const { locale } = useLocale();
  return (
    <div className="border-b border-border -mx-6 px-6">
      <nav className="flex gap-1">
        <TabLink
          href={`/prosjekter/${projectId}?tab=planlegging`}
          active={active === "planlegging"}
          icon={<Briefcase className="size-4" />}
          label={tr("proj_tab_planning", locale)}
        />
        <TabLink
          href={`/prosjekter/${projectId}?tab=kvalitet`}
          active={active === "kvalitet"}
          icon={<ShieldCheck className="size-4" />}
          label={tr("proj_tab_quality", locale)}
        />
      </nav>
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-2 hover:text-text-1"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
