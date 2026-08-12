"use client";

import * as L from "leaflet";
import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { PublicRichText } from "@/components/public/rich-text";
import { createModenaMap } from "@/features/cms/maps/utils/leaflet-map";
import { modenaComunePolygons } from "@/lib/server/modules/maps/boundary/modena-comune";

import type { MapItemDto } from "@/lib/server/modules/maps/dto";

type CmsMapWorkspaceCanvasProps = {
  items: MapItemDto[];
  selectedItemId: string | null;
  attribution: string;
  unavailableText: string;
  onSelectItem: (itemId: string) => void;
  onClearSelection: () => void;
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
  onClearSelection,
}: CmsMapWorkspaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const notifyItemSelection = useEffectEvent(onSelectItem);
  const selectedItem = items.find((item) => item.id === selectedItemId);

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
      {selectedItem ? (
        <article className="absolute inset-3 z-10 flex min-h-0 flex-col border border-foreground bg-background p-5 shadow-[5px_5px_0_rgb(0_0_0_/_16%)] sm:inset-5 sm:p-7">
          <div className="flex shrink-0 items-start justify-between gap-5 border-b border-foreground pb-4">
            <h3 className="font-heading text-[clamp(24px,2.4vw,38px)] font-black leading-[1.05] tracking-[-0.03em] text-foreground">
              {selectedItem.title}
            </h3>
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex size-9 shrink-0 items-center justify-center border border-foreground bg-card text-foreground transition-colors hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Chiudi dettaglio punto"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          {selectedItem.descriptionRich ? (
            <div className="cms-scroll min-h-0 flex-1 overflow-y-auto pt-5 pr-2">
              <PublicRichText
                value={selectedItem.descriptionRich}
                className="space-y-4 [&_blockquote]:my-5 [&_figure]:my-5 [&_h2]:mt-6 [&_h3]:mt-5 [&_ol]:my-4 [&_ul]:my-4"
              />
            </div>
          ) : null}
        </article>
      ) : null}
      {!isReady && !hasError ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      {hasError ? (
        <div className="pointer-events-none absolute inset-x-4 top-16 z-400 rounded-[6px] border border-accent bg-card px-3 py-2 text-center font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {unavailableText}
        </div>
      ) : null}
    </section>
  );
}
