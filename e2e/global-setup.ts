import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnvLocal, CREDS_PATH, type E2ECreds } from "./env";

// 1x1 transparent PNG — gyldig signatur-data-url så signeringsflyten kan testes.
const SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export default async function globalSetup(): Promise<void> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    throw new Error(
      "E2E krever NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY (sjekk .env.local)",
    );
  }

  const admin = createClient(url, svc, { auth: { persistSession: false } });
  const suffix = Date.now().toString(36);
  const password = "E2e!Test1234";
  const email = `e2e-admin-${suffix}@example.com`;
  const memberEmail = `e2e-member-${suffix}@example.com`;

  const { data: adminUser, error: e1 } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Admin" },
  });
  if (e1 || !adminUser.user) throw new Error(`createUser admin: ${e1?.message}`);

  const { data: orgId, error: e2 } = await admin.rpc("signup_organization", {
    p_user_id: adminUser.user.id,
    p_firma: `E2E Test ${suffix}`,
    p_full_name: "E2E Admin",
  });
  if (e2 || !orgId) throw new Error(`signup_organization: ${e2?.message}`);

  // Gi admin en signatur så dokument-signering kan testes.
  await admin
    .from("profiles")
    .update({ signature_data_url: SIGNATURE_PNG })
    .eq("id", adminUser.user.id);

  const { data: memberUser, error: e3 } = await admin.auth.admin.createUser({
    email: memberEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "E2E Member",
      role: "elektriker",
      organization_id: orgId,
    },
  });
  if (e3 || !memberUser.user) throw new Error(`createUser member: ${e3?.message}`);
  await admin
    .from("profiles")
    .update({ organization_id: orgId, role: "elektriker", active: true })
    .eq("id", memberUser.user.id);

  const creds: E2ECreds = {
    orgId: orgId as string,
    adminId: adminUser.user.id,
    memberId: memberUser.user.id,
    email,
    memberEmail,
    password,
    suffix,
  };
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2));
  console.log(`[e2e] Opprettet test-org ${orgId} (suffix ${suffix})`);
}
