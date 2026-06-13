"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  AlertTriangle,
  GraduationCap,
  Users,
  BookOpen,
  UserCircle,
  LogOut,
  Menu,
  X,
  Languages,
  Settings,
  FileText,
  ScrollText,
  Building2,
  MapPin,
  Kanban,
  Map,
  Briefcase,
  ShieldCheck,
  CheckSquare,
  Calendar,
  Mail,
  ListChecks,
  Layers,
  FileStack,
  FlaskConical,
  Bug,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { LocaleContext, type Locale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { Profile } from "@/lib/types/database";
import { getModeFromPath, type AppMode } from "@/lib/app-modes";
import { MyTasksBadge } from "@/components/app/my-tasks-badge";
import { ReportIssueButton } from "@/components/app/report-issue-button";
import { AssistantButton } from "@/components/app/assistant-button";

interface NavItem {
  href: string;
  labelKey: Parameters<typeof tr>[0];
  icon: ReactNode;
  badge?: ReactNode;
  adminOnly?: boolean;
}

// Felles for begge modus
const SHARED_TOP: NavItem[] = [
  { href: "/dashboard", labelKey: "nav_dashboard", icon: <LayoutDashboard className="size-4" /> },
  {
    href: "/mine-oppgaver",
    labelKey: "nav_my_tasks",
    icon: <CheckSquare className="size-4" />,
    badge: <MyTasksBadge />,
  },
  { href: "/oppgaver", labelKey: "nav_tasks", icon: <ListChecks className="size-4" /> },
  { href: "/prosjekter", labelKey: "nav_projects", icon: <FolderOpen className="size-4" /> },
];

// Kun synlige i Planner-modus
const PLANNER_NAV: NavItem[] = [
  { href: "/kanban", labelKey: "nav_kanban", icon: <Kanban className="size-4" /> },
  { href: "/kalender", labelKey: "nav_calendar", icon: <Calendar className="size-4" /> },
  { href: "/produksjonsplan", labelKey: "nav_schedule", icon: <Layers className="size-4" /> },
  { href: "/kunder", labelKey: "nav_customers", icon: <Building2 className="size-4" /> },
  { href: "/sites", labelKey: "nav_sites", icon: <MapPin className="size-4" /> },
  { href: "/kart", labelKey: "nav_map", icon: <Map className="size-4" /> },
];

// Kun synlige i Kvalitet-modus
const KVALITET_NAV: NavItem[] = [
  { href: "/skjemaer", labelKey: "nav_skjemaer", icon: <FileText className="size-4" /> },
  { href: "/avvik", labelKey: "nav_deviations", icon: <AlertTriangle className="size-4" /> },
  { href: "/iso", labelKey: "nav_iso", icon: <ShieldCheck className="size-4" /> },
  { href: "/kompetanse", labelKey: "nav_competence", icon: <GraduationCap className="size-4" /> },
  { href: "/stoffkartotek", labelKey: "nav_substances", icon: <FlaskConical className="size-4" /> },
  { href: "/rutiner", labelKey: "nav_routines", icon: <ScrollText className="size-4" /> },
  { href: "/handbok", labelKey: "nav_handbook", icon: <BookOpen className="size-4" /> },
];

// Admin-meny vises uavhengig av modus
const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin/brukere",
    labelKey: "nav_users",
    icon: <Users className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/grupper",
    labelKey: "nav_groups",
    icon: <Users className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/kategorier",
    labelKey: "nav_categories",
    icon: <Layers className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/prosjekt-maler",
    labelKey: "nav_project_templates",
    icon: <FileStack className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/maler",
    labelKey: "nav_templates",
    icon: <FileText className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/epost",
    labelKey: "nav_email",
    icon: <Mail className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/bedrift",
    labelKey: "nav_org",
    icon: <Building2 className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/abonnement",
    labelKey: "nav_subscription",
    icon: <CreditCard className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/innstillinger",
    labelKey: "nav_settings",
    icon: <Settings className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/import-wizard",
    labelKey: "nav_import_wizard",
    icon: <Sparkles className="size-4" />,
    adminOnly: true,
  },
  {
    href: "/admin/issues",
    labelKey: "nav_issues",
    icon: <Bug className="size-4" />,
    adminOnly: true,
  },
];

const MODE_STORAGE_KEY = "echoo-app-mode";

interface Props {
  profile: Profile;
  initialLocale: Locale;
  children: ReactNode;
  locked?: boolean;
}

export function AppShell({ profile, initialLocale, children, locked }: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    try {
      localStorage.setItem("opcontrol-locale", locale);
      // 1 year, root path, lax so navigation preserves it
      document.cookie = `opcontrol-locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* ignore */
    }
  }, [locale]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Aktiv modus utledes først fra URL (hvis ruten er modus-eksklusiv),
  // ellers fra localStorage. Default: planner.
  const pathMode = getModeFromPath(pathname);
  const [storedMode, setStoredMode] = useState<AppMode>("planner");
  useEffect(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === "planner" || saved === "kvalitet") setStoredMode(saved);
  }, []);
  useEffect(() => {
    if (pathMode) {
      setStoredMode(pathMode);
      localStorage.setItem(MODE_STORAGE_KEY, pathMode);
    }
  }, [pathMode]);

  const activeMode: AppMode = pathMode ?? storedMode;

  // Bygg menyen i aktiv modus
  const modeNav = activeMode === "planner" ? PLANNER_NAV : KVALITET_NAV;
  const adminVisible = profile.role === "admin" ? ADMIN_NAV : [];

  function setMode(m: AppMode) {
    setStoredMode(m);
    localStorage.setItem(MODE_STORAGE_KEY, m);
    // Hvis vi står på en rute som tilhører den andre modusen, naviger
    // til Oversikt (felles) så ikke knappen blir død — sidebar-undermenyene
    // ville ellers ikke matchet aktiv side.
    if (pathMode && pathMode !== m) {
      router.push("/dashboard");
      setMobileOpen(false);
    }
  }

  function toggleLocale() {
    setLocale((prev) => {
      const next: Locale = prev === "no" ? "en" : "no";
      // Write cookie synchronously so router.refresh() picks up the new locale on the next render
      try {
        document.cookie = `opcontrol-locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        localStorage.setItem("opcontrol-locale", next);
      } catch {
        /* ignore */
      }
      router.refresh();
      return next;
    });
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Image src="/echoo-wordmark.svg" alt="Echoo" width={110} height={31} />
          </div>

          {/* Modus-bryter */}
          <div className="px-3 pt-3">
            <div className="flex rounded-md border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setMode("planner")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeMode === "planner"
                    ? "bg-orange text-bg"
                    : "text-text-2 hover:text-text-1"
                }`}
              >
                <Briefcase className="size-3.5" />
                {tr("nav_mode_planner", locale)}
              </button>
              <button
                type="button"
                onClick={() => setMode("kvalitet")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeMode === "kvalitet"
                    ? "bg-orange text-bg"
                    : "text-text-2 hover:text-text-1"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                {tr("nav_mode_kvalitet", locale)}
              </button>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {/* Felles topp: Oversikt + Prosjekter */}
            {SHARED_TOP.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/")
                }
                locale={locale}
                onClick={() => setMobileOpen(false)}
              />
            ))}

            {/* Skille mellom felles og modus-spesifikt */}
            <div className="py-2">
              <div className="px-3 text-[10px] uppercase tracking-wider text-text-3 font-semibold">
                {activeMode === "planner"
                  ? tr("nav_section_planning", locale)
                  : tr("nav_section_quality", locale)}
              </div>
            </div>

            {/* Modus-spesifikke menypunkter */}
            {modeNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/")
                }
                locale={locale}
                onClick={() => setMobileOpen(false)}
              />
            ))}

            {/* Admin-meny */}
            {adminVisible.length > 0 && (
              <>
                <div className="py-2">
                  <div className="px-3 text-[10px] uppercase tracking-wider text-text-3 font-semibold">
                    {tr("nav_section_admin", locale)}
                  </div>
                </div>
                {adminVisible.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                    }
                    locale={locale}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </>
            )}
          </nav>

          <div className="border-t border-border p-3 space-y-1">
            <button
              onClick={toggleLocale}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-2 hover:text-text-1 hover:bg-card"
            >
              <Languages className="size-4" />
              {locale === "no" ? "English" : "Norsk"}
            </button>
            <Link
              href="/profil"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-2 hover:text-text-1 hover:bg-card"
            >
              <UserCircle className="size-4" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-text-1">
                  {profile.full_name || profile.email}
                </div>
                <div className="text-xs text-text-3 truncate capitalize">
                  {profile.role}
                </div>
              </div>
            </Link>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-2 hover:text-red"
              >
                <LogOut className="size-4" />
                {tr("nav_logout", locale)}
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-30 bg-black/60"
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden h-14 border-b border-border bg-surface flex items-center justify-between px-4">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="text-text-1 p-2 -ml-2"
              aria-label={tr("toggle_menu", locale)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Image src="/echoo-wordmark.svg" alt="Echoo" width={100} height={28} />
            <div className="w-8" />
          </header>

          <main className="flex-1 overflow-y-auto">
            {locked && (
              <div className="bg-red/10 border-b border-red/30 px-6 py-2 text-sm text-red flex items-center justify-between gap-4">
                <span>
                  <strong>Tilgangen er låst:</strong> abonnementet er
                  utløpt eller forfalt. Data er trygt — gjør betaling for å
                  gjenåpne.
                </span>
                <Link
                  href="/admin/abonnement"
                  className="font-medium underline whitespace-nowrap"
                >
                  Til abonnement
                </Link>
              </div>
            )}
            {children}
          </main>
        </div>

        <AssistantButton />
        <ReportIssueButton />
      </div>
    </LocaleContext.Provider>
  );
}

function NavLink({
  item,
  active,
  locale,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  locale: Locale;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-orange/15 text-orange"
          : "text-text-2 hover:text-text-1 hover:bg-card"
      }`}
    >
      {item.icon}
      <span className="flex-1">{tr(item.labelKey, locale)}</span>
      {item.badge}
    </Link>
  );
}
