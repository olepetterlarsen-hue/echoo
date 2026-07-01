import { redirect } from "next/navigation";

// /admin/innstillinger fjernet 2026-07-01 fordi den dupliserte alle firma-
// felt fra /admin/bedrift. Redirect så gamle bokmerker og direkte-lenker
// fortsatt lander på riktig sted. Se admin-tab-configs.tsx for kontekst.
export default function InnstillingerRedirect() {
  redirect("/admin/bedrift");
}
