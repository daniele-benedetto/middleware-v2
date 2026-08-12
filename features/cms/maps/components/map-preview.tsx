"use client";

import * as L from "leaflet";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  normalizeMapCoordinates,
  type MapCoordinates,
} from "@/features/cms/maps/utils/coordinates";
import { createModenaMap } from "@/features/cms/maps/utils/leaflet-map";
import { i18n } from "@/lib/i18n";

type CmsMapPreviewProps = {
  coordinates: MapCoordinates;
  onCoordinatesChange: (coordinates: MapCoordinates) => void;
};

export function CmsMapPreview({ coordinates, onCoordinatesChange }: CmsMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof createModenaMap> | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initialCoordinatesRef = useRef(coordinates);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const notifyCoordinatesChange = useEffectEvent(onCoordinatesChange);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setIsReady(false);

    const map = createModenaMap({
      container,
      onTileError: () => setHasError(true),
    });
    mapRef.current = map;
    const resizeMap = () => requestAnimationFrame(() => map.invalidateSize());
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(container);

    map.whenReady(() => {
      setIsReady(true);
      resizeMap();
      window.setTimeout(resizeMap, 100);
    });
    const marker = L.marker(
      [initialCoordinatesRef.current.latitude, initialCoordinatesRef.current.longitude],
      {
        draggable: true,
        icon: L.divIcon({
          className: "cms-map-pin-icon",
          html: '<span class="cms-map-pin"><span class="cms-map-pin__dot"></span></span>',
          iconSize: [38, 48],
          iconAnchor: [19, 46],
        }),
      },
    ).addTo(map);
    marker.on("dragend", () => {
      const location = marker.getLatLng();
      notifyCoordinatesChange(normalizeMapCoordinates(location.lat, location.lng));
    });
    map.on("click", (event) => {
      const nextCoordinates = normalizeMapCoordinates(event.latlng.lat, event.latlng.lng);
      marker.setLatLng([nextCoordinates.latitude, nextCoordinates.longitude]);
      notifyCoordinatesChange(nextCoordinates);
    });
    markerRef.current = marker;

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current === map) {
        markerRef.current = null;
        mapRef.current = null;
        setIsReady(false);
      }
      map.remove();
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([coordinates.latitude, coordinates.longitude]);
  }, [coordinates]);

  return (
    <section
      className="relative h-120 min-h-120 shrink-0 overflow-hidden rounded-[6px] border border-foreground bg-card"
      aria-label={i18n.cms.forms.resources.maps.previewLabel}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
      {!isReady && !hasError ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card px-6 text-center font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {i18n.cms.forms.resources.maps.previewUnavailable}
        </div>
      ) : null}
    </section>
  );
}
