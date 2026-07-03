import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { loadEnvLocal, CREDS_PATH, type E2ECreds } from "./env";

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(CREDS_PATH)) return;
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) return;

  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8")) as E2ECreds;
  const admin = createClient(url, svc, { auth: { persistSession: false } });

  await admin.auth.admin.deleteUser(creds.adminId).catch(() => {});
  await admin.auth.admin.deleteUser(creds.memberId).catch(() => {});
  // Org-cascade rydder tilhørende data (customers, sites, projects, ...).
  await admin.from("organizations").delete().eq("id", creds.orgId);

  rmSync("e2e/.auth", { recursive: true, force: true });
  console.log(`[e2e] Ryddet test-org ${creds.orgId}`);
}
