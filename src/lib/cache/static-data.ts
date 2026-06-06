// Server-side cached helpers for data som er identisk for alle brukere
// og sjelden endres.
//
// VI BRUKER React.cache (per-request dedup), IKKE unstable_cache:
// - unstable_cache er inkompatibelt med cookies()/createClient pga.
//   request scope-krav (Next.js doc)
// - React.cache dedup-er identiske kall innen samme request, som er
//   nok for å hindre at samme query kjøres 3-4 ganger pr. sidelasting
//
// Cross-request caching kan legges til senere via service-role klient
// eller ved å tillate anon SELECT på disse tabellene.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getTaskTypes = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_types")
    .select("slug, label_no, label_en, order_index")
    .eq("is_active", true)
    .order("order_index");
  return data ?? [];
});

export const getProjectStages = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_stages")
    .select("id, name, color, order_index")
    .eq("is_active", true)
    .order("order_index");
  return data ?? [];
});

export const getActiveCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_categories")
    .select("id, name, slug, field_schema, order_index")
    .eq("is_active", true)
    .order("order_index");
  return data ?? [];
});

export const getActiveTemplates = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_templates")
    .select("id, name, description")
    .eq("is_active", true)
    .order("order_index");
  return data ?? [];
});

export const getGroups = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, email")
    .order("name");
  return data ?? [];
});

export const getAppSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data;
});
