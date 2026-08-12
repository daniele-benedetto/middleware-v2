"use client";

import * as L from "leaflet";

import { modenaComuneMaxBounds } from "@/lib/server/modules/maps/boundary/modena-comune";

const modenaCenter: [number, number] = [44.6458885, 10.9255707];
const modenaZoom = 13;

type ModenaMapOptions = {
  container: HTMLElement;
  interactive?: boolean;
  onTileError?: () => void;
};

export function createModenaMap({
  container,
  interactive = true,
  onTileError,
}: ModenaMapOptions): L.Map {
  const map = L.map(container, {
    center: modenaCenter,
    zoom: modenaZoom,
    maxBounds: [
      [modenaComuneMaxBounds[0][1], modenaComuneMaxBounds[0][0]],
      [modenaComuneMaxBounds[1][1], modenaComuneMaxBounds[1][0]],
    ],
    maxBoundsViscosity: 1,
    zoomControl: interactive,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    touchZoom: interactive,
    boxZoom: interactive,
    keyboard: interactive,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  })
    .on("tileerror", onTileError ?? (() => undefined))
    .addTo(map);

  return map;
}
