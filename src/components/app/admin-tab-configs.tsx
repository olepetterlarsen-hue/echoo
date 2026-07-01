import { Users, UsersRound, Building2, Mail, CreditCard, FileText, Layers } from "lucide-react";
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

// Merk: /admin/innstillinger fjernet 2026-07-01. Den siden dupliserte
// firma/orgnr/adresse-feltene fra /admin/bedrift og skrev til en gammel
// single-tenant app_settings-tabell. Bedrift-siden er nå master, og
// getAppSettings leser fra organizations.
export const SETTINGS_TABS: AdminTab[] = [
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
