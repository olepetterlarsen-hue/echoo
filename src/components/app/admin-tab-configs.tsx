import { Users, UsersRound, Settings, Building2, Mail, CreditCard, FileText, Layers } from "lucide-react";
import type { AdminTab } from "./admin-tabs";

export const USERS_TABS: AdminTab[] = [
  {
    href: "/admin/brukere",
    label: "Brukere",
    icon: <Users className="size-4" />,
  },
  {
    href: "/admin/grupper",
    label: "Grupper",
    icon: <UsersRound className="size-4" />,
  },
];

export const SETTINGS_TABS: AdminTab[] = [
  {
    href: "/admin/innstillinger",
    label: "Generelt",
    icon: <Settings className="size-4" />,
  },
  {
    href: "/admin/bedrift",
    label: "Bedrift",
    icon: <Building2 className="size-4" />,
  },
  {
    href: "/admin/epost",
    label: "E-post",
    icon: <Mail className="size-4" />,
  },
  {
    href: "/admin/abonnement",
    label: "Abonnement",
    icon: <CreditCard className="size-4" />,
  },
  {
    href: "/admin/maler",
    label: "Dokumentmaler",
    icon: <FileText className="size-4" />,
  },
  {
    href: "/admin/prosjekt-oppsett",
    label: "Prosjekt-oppsett",
    icon: <Layers className="size-4" />,
  },
];
