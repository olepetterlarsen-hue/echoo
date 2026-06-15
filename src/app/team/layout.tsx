import { redirect } from "next/navigation";
import { requireEchooStaff, staffAdminClient } from "@/lib/team/staff";
import { TeamShell } from "./team-shell";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireEchooStaff();
  } catch {
    redirect("/dashboard");
  }

  // Tell åpne feilrapporter for sidebar-badge
  const admin = await staffAdminClient();
  const { count } = await admin
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "apen");

  return (
    <TeamShell user={user} openIssues={count ?? 0}>
      {children}
    </TeamShell>
  );
}
