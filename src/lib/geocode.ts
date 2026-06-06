// Geokoding via Nominatim (OpenStreetMap). Brukes av sites/geocode-actions og
// prosjekter/[id]/actions for "legg til på kart".

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", address);
  url.searchParams.set("countrycodes", "no");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Echoo/1.0 (https://echoo.no)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}

export function buildSearchString(parts: {
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province?: string | null;
}): string {
  const out: string[] = [];
  if (parts.address) out.push(parts.address);
  if (parts.postal_code && parts.city) {
    out.push(`${parts.postal_code} ${parts.city}`);
  } else if (parts.city) {
    out.push(parts.city);
  }
  if (parts.province) out.push(parts.province);
  out.push("Norway");
  return out.join(", ");
}
