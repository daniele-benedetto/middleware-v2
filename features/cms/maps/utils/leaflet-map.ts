"use client";

import * as L from "leaflet";

import { provinceOfModenaMaxBounds } from "@/lib/server/modules/maps/boundary/province-of-modena";

const saccaCrocettaCenter: [number, number] = [10.9006, 44.6578];
const saccaCrocettaZoom = 13.4;

type ModenaMapOptions = {
  container: HTMLElement;
  interactive?: boolean;
  boundToProvince?: boolean;
  onTileError?: () => void;
};

export function createModenaMap({
  container,
  interactive = true,
  boundToProvince = false,
  onTileError,
}: ModenaMapOptions): L.Map {
  const map = L.map(container, {
    center: [saccaCrocettaCenter[1], saccaCrocettaCenter[0]],
    zoom: saccaCrocettaZoom,
    maxBounds: boundToProvince
      ? [
          [provinceOfModenaMaxBounds[0][1], provinceOfModenaMaxBounds[0][0]],
          [provinceOfModenaMaxBounds[1][1], provinceOfModenaMaxBounds[1][0]],
        ]
      : undefined,
    maxBoundsViscosity: boundToProvince ? 1 : 0,
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
