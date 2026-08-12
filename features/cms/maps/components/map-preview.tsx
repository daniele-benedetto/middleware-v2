"use client";

import * as L from "leaflet";
import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from "react";

import {
  normalizeMapCoordinates,
  type MapCoordinates,
} from "@/features/cms/maps/utils/coordinates";
import { createModenaMap } from "@/features/cms/maps/utils/leaflet-map";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type CmsMapPreviewProps = {
  coordinates: MapCoordinates;
  onCoordinatesChange: (coordinates: MapCoordinates) => void;
};

export function CmsMapPreview({ coordinates, onCoordinatesChange }: CmsMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initialCoordinatesRef = useRef(coordinates);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const deferredAddressQuery = useDeferredValue(addressQuery.trim());
  const notifyCoordinatesChange = useEffectEvent(onCoordinatesChange);
  const addressSearch = trpc.maps.searchAddress.useQuery(
    { query: deferredAddressQuery },
    { enabled: deferredAddressQuery.length >= 3, staleTime: 30_000 },
  );
  const mapText = i18n.cms.forms.resources.maps;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = createModenaMap({
      container,
      boundToProvince: true,
      onTileError: () => setHasError(true),
    });
    mapRef.current = map;

    map.whenReady(() => {
      setIsReady(true);
      map.invalidateSize();
    });
    const marker = L.marker(
      [initialCoordinatesRef.current.latitude, initialCoordinatesRef.current.longitude],
      {
        draggable: true,
        icon: L.divIcon({
          className: "cms-map-pin-icon",
          html: '<span class="cms-map-pin" aria-hidden="true"><span class="cms-map-pin__dot"></span></span>',
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
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([coordinates.latitude, coordinates.longitude]);
  }, [coordinates]);

  const selectAddress = (address: { latitude: number; longitude: number; label: string }) => {
    const nextCoordinates = normalizeMapCoordinates(address.latitude, address.longitude);
    markerRef.current?.setLatLng([nextCoordinates.latitude, nextCoordinates.longitude]);
    mapRef.current?.flyTo([nextCoordinates.latitude, nextCoordinates.longitude], 16, {
      duration: 0.35,
    });
    onCoordinatesChange(nextCoordinates);
    setAddressQuery(address.label);
    setShowAddressSuggestions(false);
  };

  return (
    <section
      className="relative min-h-72 overflow-hidden rounded-[6px] border border-foreground bg-card"
      aria-label={i18n.cms.forms.resources.maps.previewLabel}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
      <div className="absolute top-3 right-3 left-3 z-400">
        <input
          type="search"
          value={addressQuery}
          onChange={(event) => {
            setAddressQuery(event.target.value);
            setShowAddressSuggestions(true);
          }}
          onFocus={() => setShowAddressSuggestions(true)}
          placeholder={mapText.addressSearchPlaceholder}
          className="h-10 w-full rounded-[6px] border border-foreground bg-card px-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-foreground shadow-md outline-none placeholder:text-border focus:border-accent"
        />
        {showAddressSuggestions && deferredAddressQuery.length >= 3 ? (
          <div className="max-h-56 overflow-y-auto rounded-b-[6px] border-x border-b border-foreground bg-card shadow-md">
            {addressSearch.isFetching ? (
              <div className="px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {i18n.cms.common.retry}
              </div>
            ) : addressSearch.data && addressSearch.data.length > 0 ? (
              addressSearch.data.map((address) => (
                <button
                  key={`${address.latitude}-${address.longitude}`}
                  type="button"
                  className="block w-full border-b border-border px-3 py-2 text-left font-editorial text-[14px] leading-[1.3] text-foreground last:border-b-0 hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
                  onClick={() => selectAddress(address)}
                >
                  {address.label}
                </button>
              ))
            ) : !addressSearch.isError ? (
              <div className="px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {mapText.addressSearchEmpty}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {!isReady && !hasError ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card px-6 text-center font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {i18n.cms.forms.resources.maps.previewUnavailable}
        </div>
      ) : null}
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-[4px] border border-border bg-card/90 px-2 py-1 font-ui text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {mapText.addressSearchAttribution}
      </div>
    </section>
  );
}
