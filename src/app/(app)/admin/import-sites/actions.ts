"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { getServerT } from "@/lib/i18n/server";
import type { RawSiteRow } from "@/lib/import/csv-parser";
import { suggestedColor, DEFAULT_MAP_COLOR } from "@/lib/customer-colors";

interface ImportResult {
  customers_created: number;
  customers_matched: number;
  sites_created: number;
  sites_skipped: number;
  errors: string[];
}

export async function importSites(input: {
  rows: RawSiteRow[];
}): Promise<{ result?: ImportResult; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_imp_err_not_logged_in") };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return { error: t("adm_imp_err_admin_only") };
  }

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const result: ImportResult = {
    customers_created: 0,
    customers_matched: 0,
    sites_created: 0,
    sites_skipped: 0,
    errors: [],
  };

  // 1) Unike kundenavn fra import
  const uniqueCustomerNames = [
    ...new Set(input.rows.map((r) => r.customerName)),
  ];

  // 2) Sjekk hvilke som allerede finnes
  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id, name")
    .in("name", uniqueCustomerNames);

  const customerByName = new Map<string, string>(); // name → id
  for (const c of existingCustomers ?? []) {
    customerByName.set(c.name, c.id);
  }
  result.customers_matched = customerByName.size;

  // 3) Opprett manglende kunder
  const toCreate = uniqueCustomerNames.filter((n) => !customerByName.has(n));
  if (toCreate.length > 0) {
    const { data: created, error } = await supabase
      .from("customers")
      .insert(
        toCreate.map((name) => {
          const color = suggestedColor(name);
          return {
            organization_id: orgId,
            name,
            // Sett kun farge hvis vi har et kjede-forslag — ellers la stå
            // på null så kunden bruker OPCOM-oransje default.
            map_color: color !== DEFAULT_MAP_COLOR ? color : null,
            created_by: user.id,
          };
        }),
      )
      .select("id, name");
    if (error) {
      return {
        error: t("adm_imp_err_create_customers").replace("{msg}", error.message),
      };
    }
    for (const c of created ?? []) customerByName.set(c.name, c.id);
    result.customers_created = created?.length ?? 0;
  }

  // 4) Sjekk hvilke sites som allerede finnes (matcher på external_site_id)
  const externalIds = input.rows
    .map((r) => r.externalSiteId)
    .filter((x): x is string => x !== null);
  const { data: existingSites } = await supabase
    .from("sites")
    .select("external_site_id")
    .in("external_site_id", externalIds);
  const existingIds = new Set(
    (existingSites ?? [])
      .map((s) => s.external_site_id)
      .filter((x): x is string => x !== null),
  );

  // 5) Opprett nye sites
  const toCreateSites = input.rows
    .filter((r) => {
      if (r.externalSiteId && existingIds.has(r.externalSiteId)) {
        result.sites_skipped++;
        return false;
      }
      return true;
    })
    .map((r) => ({
      organization_id: orgId,
      customer_id: customerByName.get(r.customerName) ?? null,
      external_site_id: r.externalSiteId,
      name: r.siteName,
      address: r.address || null,
      postal_code: r.postal_code,
      city: r.city,
      province: r.province,
      created_by: user.id,
    }));

  if (toCreateSites.length > 0) {
    // Insert i mindre batcher for å unngå PostgREST-grenser
    const BATCH = 50;
    for (let i = 0; i < toCreateSites.length; i += BATCH) {
      const batch = toCreateSites.slice(i, i + BATCH);
      const { data: created, error } = await supabase
        .from("sites")
        .insert(batch)
        .select("id");
      if (error) {
        result.errors.push(
          t("adm_imp_err_batch")
            .replace("{a}", String(i))
            .replace("{b}", String(i + batch.length))
            .replace("{msg}", error.message),
        );
      } else {
        result.sites_created += created?.length ?? 0;
      }
    }
  }

  revalidatePath("/sites");
  revalidatePath("/kunder");
  revalidatePath("/kart");
  return { result };
}
