"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PublicRichText } from "@/components/public/rich-text";
import { i18n } from "@/lib/i18n";
import { modenaComuneMaxBounds } from "@/lib/server/modules/maps/boundary/modena-comune";

import type { PublicMapDetailDto } from "@/lib/server/modules/maps/dto/public";
import type { TouchEvent as ReactTouchEvent } from "react";

function MapItemDetail({
  item,
  onClose,
  className,
}: {
  item: PublicMapDetailDto["items"][number];
  onClose: () => void;
  className: string;
}) {
  return (
    <article className={className} role="region" aria-labelledby={`map-item-${item.id}`}>
      <div className="flex shrink-0 items-start justify-between gap-5 border-b border-foreground pb-4">
        <h3
          id={`map-item-${item.id}`}
          className="font-heading text-[clamp(24px,2.4vw,38px)] font-black leading-[1.05] tracking-[-0.03em] text-foreground"
        >
          {item.title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center border border-foreground bg-card text-foreground transition-colors hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={i18n.public.maps.closeItemDetail}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {item.descriptionRich ? (
        <div className="cms-scroll min-h-0 flex-1 overflow-y-auto pt-5 pr-2">
          <PublicRichText
            value={item.descriptionRich}
            className="space-y-4 text-foreground [&_a]:text-foreground [&_blockquote]:my-5 [&_figure]:my-5 [&_h2]:mt-6 [&_h3]:mt-5 [&_li]:text-foreground [&_ol]:my-4 [&_p]:text-foreground [&_strong]:text-foreground [&_ul]:my-4"
          />
        </div>
      ) : null}
    </article>
  );
}

export function MapHomeCanvas({
  map,
  selectedItemId,
  onSelectItem,
}: {
  map: PublicMapDetailDto;
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef(new Map<string, import("leaflet").Marker>());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchPromptTimerRef = useRef<number | null>(null);
  const [shouldInitialize, setShouldInitialize] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showTouchPrompt, setShowTouchPrompt] = useState(false);
  const selectedItem = map.items.find((item) => item.id === selectedItemId);

  function clearTouchPromptTimer() {
    if (touchPromptTimerRef.current !== null) {
      window.clearTimeout(touchPromptTimerRef.current);
      touchPromptTimerRef.current = null;
    }
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    clearTouchPromptTimer();
    setShowTouchPrompt(false);
    const touch = event.touches[0];
    touchStartRef.current =
      event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.touches[0];
    if (!start || event.touches.length !== 1 || !touch) return;

    const distance = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
    if (distance < 8) return;

    touchStartRef.current = null;
    setShowTouchPrompt(true);
    clearTouchPromptTimer();
    touchPromptTimerRef.current = window.setTimeout(() => {
      touchPromptTimerRef.current = null;
      setShowTouchPrompt(false);
    }, 2600);
  }

  function handleTouchEnd() {
    touchStartRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (touchPromptTimerRef.current !== null) {
        window.clearTimeout(touchPromptTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId || !window.matchMedia("(max-width: 767px)").matches) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [selectedItemId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const IntersectionObserverConstructor = (
      window as Window & { IntersectionObserver?: typeof IntersectionObserver }
    ).IntersectionObserver;

    if (!IntersectionObserverConstructor) {
      const frameId = requestAnimationFrame(() => setShouldInitialize(true));
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserverConstructor(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setShouldInitialize(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldInitialize) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanup = () => undefined;

    void import("leaflet")
      .then((L) => {
        if (cancelled) return;

        const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        const leafletMap = L.map(container, {
          center: [44.6458885, 10.9255707],
          zoom: 13,
          maxBounds: [
            [modenaComuneMaxBounds[0][1], modenaComuneMaxBounds[0][0]],
            [modenaComuneMaxBounds[1][1], modenaComuneMaxBounds[1][0]],
          ],
          maxBoundsViscosity: 1,
          dragging: !isCoarsePointer,
          scrollWheelZoom: false,
        });
        const handleTouchStart = (event: globalThis.TouchEvent) => {
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
          attribution: i18n.public.maps.attribution,
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
          return L.marker([Number(item.latitude), Number(item.longitude)], {
            icon,
            title: item.title,
            alt: item.title,
          }).on("click", () => {
            onSelectItem(item.id);
          });
        });
        markersRef.current = new Map(map.items.map((item, index) => [item.id, markers[index]]));
        leafletMapRef.current = leafletMap;
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
          leafletMapRef.current = null;
          markersRef.current.clear();
        };
      })
      .catch(() => setHasError(true));

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [map, onSelectItem, shouldInitialize]);

  useEffect(() => {
    if (!selectedItemId) return;

    const marker = markersRef.current.get(selectedItemId);
    const leafletMap = leafletMapRef.current;
    if (!marker || !leafletMap) return;

    markersRef.current.forEach((currentMarker, itemId) => {
      currentMarker
        .getElement()
        ?.querySelector<HTMLElement>(".cms-map-pin")
        ?.toggleAttribute("data-selected", itemId === selectedItemId);
    });
    leafletMap.panTo(marker.getLatLng(), { animate: true });
  }, [selectedItemId]);

  return (
    <div
      ref={viewportRef}
      className="absolute inset-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div
        ref={containerRef}
        className="public-map-canvas absolute inset-0"
        aria-busy={!shouldInitialize}
        aria-label={map.title}
      />
      {showTouchPrompt ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-foreground/55 p-6 text-center md:hidden">
          <p className="font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase">
            {i18n.public.maps.touchInteractionPrompt}
          </p>
        </div>
      ) : null}
      {selectedItem ? (
        <>
          <MapItemDetail
            item={selectedItem}
            onClose={() => onSelectItem(null)}
            className="absolute inset-3 z-10 hidden min-h-0 flex-col border border-foreground bg-background p-5 text-foreground shadow-[5px_5px_0_rgb(0_0_0_/_16%)] md:flex sm:inset-5 sm:p-7"
          />
          {createPortal(
            <MapItemDetail
              item={selectedItem}
              onClose={() => onSelectItem(null)}
              className="fixed inset-0 z-120 flex min-h-0 flex-col bg-background p-5 text-foreground sm:p-7"
            />,
            document.body,
          )}
        </>
      ) : null}
      {hasError ? (
        <p className="absolute inset-x-4 top-4 rounded-[6px] border border-accent bg-background px-3 py-2 text-center font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {i18n.public.maps.unavailable}
        </p>
      ) : null}
    </div>
  );
}
