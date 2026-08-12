"use client";

import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";

import { extractPlainText } from "@/lib/rich-text/plain-text";
import { modenaComuneMaxBounds } from "@/lib/server/modules/maps/boundary/modena-comune";

import type { PublicMapDetailDto } from "@/lib/server/modules/maps/dto/public";

export function MapHomeCanvas({ map }: { map: PublicMapDetailDto }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const leafletMap = L.map(container, {
      center: [44.6458885, 10.9255707],
      zoom: 13,
      maxBounds: [
        [modenaComuneMaxBounds[0][1], modenaComuneMaxBounds[0][0]],
        [modenaComuneMaxBounds[1][1], modenaComuneMaxBounds[1][0]],
      ],
      maxBoundsViscosity: 1,
    });
    const resizeObserver = new ResizeObserver(() => leafletMap.invalidateSize());
    resizeObserver.observe(container);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    })
      .on("tileerror", () => setHasError(true))
      .addTo(leafletMap);

    const markers = map.items.map((item) =>
      L.marker([Number(item.latitude), Number(item.longitude)], {
        icon: createPinIcon(),
      }).bindPopup(createPopupContent(item), { className: "map-point-popup-shell", maxWidth: 320 }),
    );
    markers.forEach((marker) => marker.addTo(leafletMap));

    if (markers.length > 0) {
      leafletMap.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      resizeObserver.disconnect();
      leafletMap.remove();
    };
  }, [map]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" aria-label={map.title} />
      {hasError ? (
        <p className="absolute inset-x-4 top-4 rounded-[6px] border border-accent bg-background px-3 py-2 text-center font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Mappa non disponibile
        </p>
      ) : null}
    </div>
  );
}
const createPinIcon = () =>
  L.divIcon({
    className: "cms-map-pin-icon",
    html: '<span class="cms-map-pin"><span class="cms-map-pin__dot"></span></span>',
    iconSize: [38, 48],
    iconAnchor: [19, 46],
    popupAnchor: [0, -42],
  });

const createPopupContent = (item: PublicMapDetailDto["items"][number]) => {
  const content = document.createElement("article");
  content.className = "map-point-popup";
  const title = document.createElement("h3");
  title.textContent = item.title;
  content.append(title);
  const description = extractPlainText(item.descriptionRich);

  if (description) {
    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    content.append(paragraph);
  }

  return content;
};
