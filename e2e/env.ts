import { existsSync, readFileSync } from "node:fs";

/**
 * Minimal .env.local-leser (samme mønster som scripts/tenant-isolation-test.mjs)
 * så E2E-oppsettet får Supabase-nøklene uten dotenv-avhengighet.
 */
export function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

export const CREDS_PATH = "e2e/.auth/creds.json";
export const STORAGE_STATE_PATH = "e2e/.auth/admin.json";

export interface E2ECreds {
  orgId: string;
  adminId: string;
  memberId: string;
  email: string;
  memberEmail: string;
  password: string;
  suffix: string;
}
