import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { MapClient } from "./map-client";

export default async function MapPage() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("sites")
    .select(
      "id, name, external_site_id, address, city, latitude, longitude, site_type, customer:customers(id, name, map_color)",
    )
    .eq("active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const markers = (sites ?? []).map((s) => {
    const customer = (
      s as unknown as {
        customer?: { id: string; name: string; map_color: string | null } | null;
      }
    ).customer;
    return {
      id: s.id,
      name: s.name,
      external_site_id: s.external_site_id,
      address: s.address,
      city: s.city,
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      site_type: s.site_type,
      customer_name: customer?.name ?? null,
      customer_id: customer?.id ?? null,
      customer_color: customer?.map_color ?? null,
    };
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("map_title")}</h1>
          <p className="text-text-3 text-xs">
            {t("map_count_subtitle").replace("{n}", String(markers.length))}
          </p>
        </div>
      </header>
      <div className="flex-1 relative">
        <MapClient markers={markers} />
      </div>
    </div>
  );
}
