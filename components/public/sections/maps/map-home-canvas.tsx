"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PublicRichText } from "@/components/public/rich-text";
import { modenaComuneMaxBounds } from "@/lib/server/modules/maps/boundary/modena-comune";

import type { PublicMapDetailDto } from "@/lib/server/modules/maps/dto/public";

export function MapHomeCanvas({ map }: { map: PublicMapDetailDto }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = map.items.find((item) => item.id === selectedItemId);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanup = () => undefined;

    void import("leaflet").then((L) => {
      if (cancelled) return;

      const leafletMap = L.map(container, {
        center: [44.6458885, 10.9255707],
        zoom: 13,
        maxBounds: [
          [modenaComuneMaxBounds[0][1], modenaComuneMaxBounds[0][0]],
          [modenaComuneMaxBounds[1][1], modenaComuneMaxBounds[1][0]],
        ],
        maxBoundsViscosity: 1,
        dragging: !L.Browser.touch,
      });
      const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length >= 2) leafletMap.dragging.enable();
      };
      const handleTouchEnd = () => leafletMap.dragging.disable();
      if (L.Browser.touch) {
        container.addEventListener("touchstart", handleTouchStart, {
          capture: true,
          passive: true,
        });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });
        container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      }
      const resizeObserver = new ResizeObserver(() => leafletMap.invalidateSize());
      resizeObserver.observe(container);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      })
        .on("tileerror", () => setHasError(true))
        .addTo(leafletMap);

      const markers = map.items.map((item) => {
        const icon = L.divIcon({
          className: "cms-map-pin-icon",
          html: '<span class="cms-map-pin"><span class="cms-map-pin__dot"></span></span>',
          iconSize: [38, 48],
          iconAnchor: [19, 46],
        });
        return L.marker([Number(item.latitude), Number(item.longitude)], { icon }).on(
          "click",
          () => {
            setSelectedItemId(item.id);
            if (window.matchMedia("(max-width: 767px)").matches) {
              requestAnimationFrame(() => {
                container.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
              });
            }
          },
        );
      });
      markers.forEach((marker) => marker.addTo(leafletMap));

      if (markers.length > 0) {
        leafletMap.fitBounds(L.featureGroup(markers).getBounds(), {
          padding: [40, 40],
          maxZoom: 14,
        });
      }

      cleanup = () => {
        resizeObserver.disconnect();
        container.removeEventListener("touchstart", handleTouchStart, { capture: true });
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
        leafletMap.remove();
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [map]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" aria-label={map.title} />
      {selectedItem ? (
        <article className="absolute inset-3 z-10 flex min-h-0 flex-col border border-foreground bg-background p-5 shadow-[5px_5px_0_rgb(0_0_0_/_16%)] sm:inset-5 sm:p-7">
          <div className="flex shrink-0 items-start justify-between gap-5 border-b border-foreground pb-4">
            <h3 className="font-heading text-[clamp(24px,2.4vw,38px)] font-black leading-[1.05] tracking-[-0.03em] text-foreground">
              {selectedItem.title}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
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
      {hasError ? (
        <p className="absolute inset-x-4 top-4 rounded-[6px] border border-accent bg-background px-3 py-2 text-center font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Mappa non disponibile
        </p>
      ) : null}
    </div>
  );
}
