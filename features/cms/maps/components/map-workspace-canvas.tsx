"use client";

import * as L from "leaflet";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { createModenaMap } from "@/features/cms/maps/utils/leaflet-map";
import { modenaComunePolygons } from "@/lib/server/modules/maps/boundary/modena-comune";

import type { MapItemDto } from "@/lib/server/modules/maps/dto";

type CmsMapWorkspaceCanvasProps = {
  items: MapItemDto[];
  selectedItemId: string | null;
  attribution: string;
  unavailableText: string;
  onSelectItem: (itemId: string) => void;
};

function createPinIcon(selected: boolean) {
  return L.divIcon({
    className: "cms-map-pin-icon",
    html: `<span class="cms-map-pin" data-selected="${selected}"><span class="cms-map-pin__dot"></span></span>`,
    iconSize: [38, 48],
    iconAnchor: [19, 46],
  });
}

export function CmsMapWorkspaceCanvas({
  items,
  selectedItemId,
  attribution,
  unavailableText,
  onSelectItem,
}: CmsMapWorkspaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const notifyItemSelection = useEffectEvent(onSelectItem);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = createModenaMap({ container, onTileError: () => setHasError(true) });
    mapRef.current = map;
    const markers = markersRef.current;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    map.whenReady(() => {
      const boundary = {
        type: "MultiPolygon",
        coordinates: modenaComunePolygons.map((polygon) => [polygon]),
      } as Parameters<typeof L.geoJSON>[0];
      L.geoJSON(boundary, {
        style: { color: "#ba2e2e", weight: 2, opacity: 0.8, fill: false },
      }).addTo(map);
      setIsReady(true);
      map.invalidateSize();
    });

    return () => {
      resizeObserver.disconnect();
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
      const marker = L.marker([Number(item.latitude), Number(item.longitude)], {
        icon: createPinIcon(item.id === selectedItemId),
      })
        .on("click", () => notifyItemSelection(item.id))
        .addTo(map);
      markersRef.current.set(item.id, marker);
    }

    if (items.length > 0 && !selectedItemId) {
      map.fitBounds(
        L.latLngBounds(items.map((item) => [Number(item.latitude), Number(item.longitude)])),
        { padding: [56, 56], maxZoom: 14, animate: false },
      );
    }
  }, [isReady, items, selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) return;
    const marker = markersRef.current.get(selectedItemId);
    if (!marker) return;
    mapRef.current?.flyTo(marker.getLatLng(), undefined, { duration: 0.3 });
  }, [selectedItemId]);

  return (
    <section
      className="relative h-160 min-h-160 w-full shrink-0 overflow-hidden rounded-[6px] border border-foreground bg-card"
      aria-label={attribution}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {!isReady && !hasError ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      {hasError ? (
        <div className="pointer-events-none absolute inset-x-4 top-16 z-400 rounded-[6px] border border-accent bg-card px-3 py-2 text-center font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {unavailableText}
        </div>
      ) : null}
    </section>
  );
}
