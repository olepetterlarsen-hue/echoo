"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MAP_COLOR } from "@/lib/customer-colors";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface SiteMarker {
  id: string;
  name: string;
  external_site_id: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  site_type: string | null;
  customer_name: string | null;
  customer_id: string | null;
  customer_color: string | null;
}

interface Props {
  markers: SiteMarker[];
}

const NO_CUSTOMER_KEY = "__none__";

export function MapClient({ markers }: Props) {
  const { locale } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerLayersRef = useRef<Map<string, any[]>>(new Map());

  const noCustomerLabel = tr("map_no_customer", locale);
  const popupCustomerLabel = tr("map_popup_customer", locale);

  // Lag legende-gruppene (key = customer_id eller NO_CUSTOMER_KEY)
  const legend = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const m of markers) {
      const key = m.customer_id ?? NO_CUSTOMER_KEY;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          id: key,
          name: m.customer_name ?? noCustomerLabel,
          color: m.customer_color ?? DEFAULT_MAP_COLOR,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [markers, noCustomerLabel]);

  // Hvilke kunder som er synlige (default: alle)
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(legend.map((l) => l.id)),
  );

  function toggle(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function showOnly(id: string) {
    setVisible(new Set([id]));
  }
  function showAll() {
    setVisible(new Set(legend.map((l) => l.id)));
  }

  // Init map én gang
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L = (await import("leaflet")).default;
      if (!document.querySelector('link[data-leaflet="1"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.dataset.leaflet = "1";
        link.integrity =
          "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;
      if (mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [64.0, 11.0],
        zoom: 5,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const bounds: [number, number][] = [];
      const layers = new Map<string, unknown[]>();
      for (const m of markers) {
        const color = m.customer_color ?? DEFAULT_MAP_COLOR;
        const icon = L.divIcon({
          className: "echoo-marker",
          html: `<div style="
            background:${color};
            border:2px solid #fff;
            border-radius:50%;
            width:14px;
            height:14px;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
        const lines: string[] = [];
        lines.push(
          `<a href="/sites/${m.id}" style="color:${color};font-weight:600;text-decoration:none;">${escapeHtml(m.name)}</a>`,
        );
        if (m.external_site_id) {
          lines.push(
            `<div style="font-family:monospace;font-size:11px;color:#666;">${escapeHtml(m.external_site_id)}</div>`,
          );
        }
        if (m.customer_name && m.customer_id) {
          lines.push(
            `<div style="font-size:12px;margin-top:4px;">${escapeHtml(popupCustomerLabel)}<a href="/kunder/${m.customer_id}" style="color:${color};">${escapeHtml(m.customer_name)}</a></div>`,
          );
        }
        if (m.address || m.city) {
          lines.push(
            `<div style="font-size:11px;color:#666;margin-top:2px;">${escapeHtml([m.address, m.city].filter(Boolean).join(", "))}</div>`,
          );
        }
        if (m.site_type) {
          lines.push(
            `<div style="font-size:11px;color:#666;margin-top:2px;">${escapeHtml(m.site_type)}</div>`,
          );
        }
        marker.bindPopup(lines.join(""));
        bounds.push([m.latitude, m.longitude]);

        const key = m.customer_id ?? NO_CUSTOMER_KEY;
        const list = layers.get(key) ?? [];
        list.push(marker);
        layers.set(key, list);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markerLayersRef.current = layers as unknown as Map<string, any[]>;

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [markers, popupCustomerLabel]);

  // Skjul/vis markører når `visible` endrer seg
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = markerLayersRef.current;
    for (const [key, list] of layers.entries()) {
      const shouldShow = visible.has(key);
      for (const marker of list) {
        if (shouldShow) {
          if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
          if (map.hasLayer(marker)) map.removeLayer(marker);
        }
      }
    }
  }, [visible]);

  if (markers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-3 text-sm">
        {tr("map_empty", locale)}{" "}
        <a href="/sites/ny" className="text-orange hover:underline ml-1">
          {tr("map_empty_create", locale)}
        </a>
        .
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Legende: stables i nedre høyre hjørne */}
      <div className="absolute top-4 right-4 z-[400] max-w-xs">
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
            <h3 className="text-xs uppercase tracking-wider text-text-3">
              {tr("map_customers_count", locale).replace(
                "{n}",
                String(legend.length),
              )}
            </h3>
            <button
              type="button"
              onClick={showAll}
              className="text-xs text-text-3 hover:text-text-1 underline"
            >
              {tr("map_show_all", locale)}
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {legend.map((entry) => {
              const active = visible.has(entry.id);
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-2 px-3 py-1.5 hover:bg-card-hover ${
                    active ? "" : "opacity-40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(entry.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className="inline-block size-3 rounded-full shrink-0 border border-white/40"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-text-1 truncate">
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-text-3 ml-auto shrink-0">
                      {entry.count}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showOnly(entry.id)}
                    title={tr("map_show_only", locale)}
                    className="text-[10px] text-text-3 hover:text-orange shrink-0"
                  >
                    {tr("map_only", locale)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
