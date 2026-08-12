"use client";

import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";

import { createModenaMap } from "@/features/cms/maps/utils/leaflet-map";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { provinceOfModenaPolygons } from "@/lib/server/modules/maps/boundary/province-of-modena";

import type { MapItemDto } from "@/lib/server/modules/maps/dto";

type CmsMapWorkspaceCanvasProps = {
  items: MapItemDto[];
  selectedItemId: string | null;
  attribution: string;
  unavailableText: string;
  onSelectItem: (itemId: string) => void;
  selectedItemHref: (itemId: string) => string;
};

export function CmsMapWorkspaceCanvas({
  items,
  selectedItemId,
  attribution,
  unavailableText,
  onSelectItem,
  selectedItemHref,
}: CmsMapWorkspaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const markers = markersRef.current;

    const map = createModenaMap({
      container,
      boundToProvince: true,
      onTileError: () => setHasError(true),
    });
    mapRef.current = map;

    map.whenReady(() => {
      const boundary = {
        type: "MultiPolygon",
        coordinates: provinceOfModenaPolygons.map((polygon) => [polygon]),
      } as Parameters<typeof L.geoJSON>[0];

      L.geoJSON(boundary, {
        style: { color: "#ba2e2e", weight: 2, opacity: 0.8, fill: false },
      }).addTo(map);
      setIsReady(true);
      map.invalidateSize();
    });
    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    for (const item of items) {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.ariaLabel = item.title;
      markerElement.className = "cms-map-pin";
      markerElement.innerHTML = '<span class="cms-map-pin__dot"></span>';
      markerElement.dataset.selected = item.id === selectedItemId ? "true" : "false";
      markerElement.addEventListener("click", () => onSelectItem(item.id));

      const marker = L.marker([Number(item.latitude), Number(item.longitude)], {
        icon: L.divIcon({
          className: "",
          html: markerElement,
          iconSize: [38, 48],
          iconAnchor: [19, 46],
        }),
      }).addTo(map);
      markersRef.current.set(item.id, marker);
    }

    if (items.length > 0 && !selectedItemId) {
      const bounds = L.latLngBounds(
        items.map((item) => [Number(item.latitude), Number(item.longitude)] as L.LatLngTuple),
      );
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14, animate: false });
    }
  }, [isReady, items, onSelectItem, selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) return;
    const marker = markersRef.current.get(selectedItemId);
    if (!marker) return;

    mapRef.current?.flyTo(marker.getLatLng(), undefined, { duration: 0.3 });
    marker.getElement()?.querySelector("button")?.focus({ preventScroll: true });
  }, [selectedItemId]);

  const selectedItem = items.find((item) => item.id === selectedItemId);
  const selectedDescription = selectedItem ? extractPlainText(selectedItem.descriptionRich) : null;

  return (
    <section
      className="relative min-h-96 flex-1 overflow-hidden rounded-[6px] border border-foreground bg-card"
      aria-label={attribution}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {selectedItem ? (
        <aside className="absolute right-4 bottom-4 max-w-72 rounded-[6px] border border-foreground bg-card p-4 shadow-lg">
          <div className="font-editorial text-[18px] leading-[1.15] text-foreground">
            {selectedItem.title}
          </div>
          {selectedDescription ? (
            <p className="mt-2 line-clamp-3 font-editorial text-[14px] leading-[1.35] text-muted-foreground">
              {selectedDescription}
            </p>
          ) : null}
          <a
            href={selectedItemHref(selectedItem.id)}
            className="mt-3 inline-flex font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-accent underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Modifica punto
          </a>
        </aside>
      ) : null}
      {!isReady && !hasError ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      {hasError ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-[6px] border border-accent bg-card px-3 py-2 text-center font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {unavailableText}
        </div>
      ) : null}
    </section>
  );
}
