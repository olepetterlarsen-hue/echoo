import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal, CREDS_PATH, type E2ECreds } from "./env";

/**
 * Kritisk HR-onboarding-flyt:
 *   admin oppretter arbeidsavtale -> signerer og sender (får token-lenke) ->
 *   ansatt signerer via token uten innlogging -> brukerkonto opprettes +
 *   prøvetids-evalueringsoppgave lages.
 *
 * AI-sjekken testes ikke her (koster penger + er ikke-deterministisk); den er
 * en frivillig hjelpeknapp og blokkerer ikke hovedflyten.
 */

function admin(): SupabaseClient {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

// Tegn en strek på signatur-canvasen slik at signature_pad fyrer endStroke.
async function drawSignature(scope: import("@playwright/test").Page) {
  const canvas = scope.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Fant ikke signatur-canvas");
  const y = box.y + box.height / 2;
  await scope.mouse.move(box.x + 20, y);
  await scope.mouse.down();
  await scope.mouse.move(box.x + box.width - 20, y - 15, { steps: 8 });
  await scope.mouse.move(box.x + box.width - 10, y + 15, { steps: 8 });
  await scope.mouse.up();
}

test("opprett arbeidsavtale, signer via token, bruker + prøvetidsoppgave opprettes", async ({
  page,
}) => {
  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8")) as E2ECreds;
  const db = admin();
  const employeeEmail = `e2e-ansatt-${creds.suffix}-${Date.now().toString(36)}@example.com`;
  const employeeName = `E2E Ansatt ${creds.suffix}`;

  try {
    // 1. Admin fyller ut avtalen.
    await page.goto("/admin/ansatte/ny");
    await page.getByLabel("Fullt navn").fill(employeeName);
    await page.getByLabel("E-post").fill(employeeEmail);
    await page.getByLabel("Stilling / tittel").fill("Elektriker");
    await page.getByLabel("Tiltredelsesdato").fill("2026-09-01");
    await page.getByLabel("Prøvetid (måneder)").selectOption("6");
    await page.getByLabel("Årslønn (kr)").fill("650000");

    // 2. Signer og send -> arbeidsgiver-signatur + token-lenke.
    await page.getByRole("button", { name: "Signer og send til ansatt" }).click();

    const signLink = page.locator('input[readonly]');
    await expect(signLink).toBeVisible({ timeout: 20_000 });
    const signUrl = await signLink.inputValue();
    expect(signUrl).toMatch(/\/signer-kontrakt\//);
    const tokenPath = new URL(signUrl).pathname;

    // 3. Ansatt åpner token-lenka og signerer (uten egen innlogging).
    await page.goto(tokenPath);
    await expect(page.getByRole("heading", { name: "Arbeidsavtale" })).toBeVisible();
    await drawSignature(page);
    await page.getByRole("button", { name: "Signer avtalen" }).click();
    await expect(page.getByText("Avtalen er signert")).toBeVisible({
      timeout: 20_000,
    });

    // 4. Verifiser i DB: avtale signert, bruker opprettet, oppgave laget.
    const { data: contract } = await db
      .from("employment_contracts")
      .select("id, status, profile_id, provetid_slutt, organization_id")
      .eq("employee_email", employeeEmail)
      .single();
    expect(contract?.status).toBe("signert");
    expect(contract?.organization_id).toBe(creds.orgId);
    expect(contract?.profile_id).toBeTruthy();

    const { data: profile } = await db
      .from("profiles")
      .select("id, organization_id")
      .eq("id", contract!.profile_id)
      .single();
    expect(profile?.organization_id).toBe(creds.orgId);

    const { data: task } = await db
      .from("tasks")
      .select("id, task_type_slug, status, due_date")
      .eq("organization_id", creds.orgId)
      .eq("task_type_slug", "provetid_evaluering")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(task, "prøvetids-evalueringsoppgave skal være opprettet").toBeTruthy();
    // Forfall 14 dager før prøvetidens slutt.
    if (task?.due_date && contract?.provetid_slutt) {
      const diffDays =
        (new Date(contract.provetid_slutt).getTime() -
          new Date(task.due_date).getTime()) /
        86_400_000;
      expect(Math.round(diffDays)).toBe(14);
    }
  } finally {
    // Rydd opp den nyopprettede ansatt-brukeren (teardown rydder bare org + admin/member).
    const { data: list } = await db.auth.admin.listUsers();
    const created = list?.users.find((u) => u.email === employeeEmail);
    if (created) await db.auth.admin.deleteUser(created.id).catch(() => {});
  }
});
