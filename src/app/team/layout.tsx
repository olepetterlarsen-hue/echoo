import { redirect } from "next/navigation";
import { requireEchooStaff } from "@/lib/team/staff";
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
  return <TeamShell user={user}>{children}</TeamShell>;
}
