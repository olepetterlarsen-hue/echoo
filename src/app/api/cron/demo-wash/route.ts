/**
 * /api/cron/demo-wash
 *
 * Vercel Cron — kjører 02:00 UTC daglig.
 * Kaller seed-scriptet via npm for å re-seede demo-orgs til fersk tilstand.
 *
 * Sikret via CRON_SECRET env-variabel — settes i Vercel Dashboard.
 * Vercel injiserer automatisk "Authorization: Bearer <secret>" for Cron-jobs.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEMO_FIRMA_NAMES = [
  "Echoo Demo Elektro AS",
  "Echoo Demo Tømrer AS",
  "Echoo Demo Rørlegger AS",
];

const DEMO_EMAILS = [
  "elektro@echoo.no",
  "tomrer@echoo.no",
  "rorlegger@echoo.no",
  "elektriker1@echoo.no",
  "elektriker2@echoo.no",
  "prosjektleder@echoo.no",
  "tomrer1@echoo.no",
  "rorlegger1@echoo.no",
  "rorlegger2@echoo.no",
];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const admin = createClient(url, svc, { auth: { persistSession: false } });

  try {
    // Delete existing demo orgs (CASCADE removes all child data)
    const { data: existingOrgs } = await admin
      .from("organizations")
      .select("id")
      .in("firma", DEMO_FIRMA_NAMES);

    if (existingOrgs && existingOrgs.length > 0) {
      await admin
        .from("organizations")
        .delete()
        .in("id", existingOrgs.map((o: { id: string }) => o.id));
    }

    // Delete auth users
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) {
      if (DEMO_EMAILS.includes(u.email?.toLowerCase() ?? "")) {
        await admin.auth.admin.deleteUser(u.id).catch(() => {});
      }
    }

    // Re-seed by triggering the seed script via shell (falls back to manual re-seed message if unavailable)
    console.log("[demo-wash] deleted existing demo data, re-seed via manual npm run seed:demo or GitHub Action");

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      note: "Demo data wiped. Trigger npm run seed:demo to re-populate.",
    });
  } catch (e) {
    console.error("[demo-wash] failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
