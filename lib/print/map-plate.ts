import { printFormat } from "@/lib/print/format";

export type PrintMapCoordinate = { latitude: number; longitude: number };

export type PrintMapTile = {
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PrintMapMarker = { label: string; left: number; top: number };

export type PrintMapPlate = {
  widthMm: number;
  heightMm: number;
  zoom: number;
  tiles: PrintMapTile[];
  markers: PrintMapMarker[];
};

export type PrintMapPlateOptions = {
  widthMm: number;
  heightMm: number;
  /** Region that must contain every marker, centered in the plate. */
  safeWidthMm: number;
  safeHeightMm: number;
  /** Printed size of one 256px tile: smaller is sharper, but map labels shrink. */
  tileSizeMm: number;
  minZoom: number;
  maxZoom: number;
};

export const printMapPlateOptions: PrintMapPlateOptions = printFormat.mapPlate;

const TILE_SIZE_PX = 256;
const TILE_SUBDOMAINS = ["a", "b", "c"];
const MODENA_CENTER: PrintMapCoordinate = { latitude: 44.6458885, longitude: 10.9255707 };
const EMPTY_MAP_ZOOM = 13;

function projectToWorldPixels({ latitude, longitude }: PrintMapCoordinate, zoom: number) {
  const scale = TILE_SIZE_PX * 2 ** zoom;
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale,
  };
}

function mmToPixels(mm: number, options: PrintMapPlateOptions) {
  return (mm / options.tileSizeMm) * TILE_SIZE_PX;
}

function fitsSafeArea(points: PrintMapCoordinate[], zoom: number, options: PrintMapPlateOptions) {
  const projected = points.map((point) => projectToWorldPixels(point, zoom));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);

  return (
    Math.max(...xs) - Math.min(...xs) <= mmToPixels(options.safeWidthMm, options) &&
    Math.max(...ys) - Math.min(...ys) <= mmToPixels(options.safeHeightMm, options)
  );
}

function resolveZoom(points: PrintMapCoordinate[], options: PrintMapPlateOptions) {
  if (points.length === 0) return EMPTY_MAP_ZOOM;

  for (let zoom = options.maxZoom; zoom > options.minZoom; zoom -= 1) {
    if (fitsSafeArea(points, zoom, options)) return zoom;
  }

  return options.minZoom;
}

function resolveCenter(points: PrintMapCoordinate[], zoom: number) {
  if (points.length === 0) return projectToWorldPixels(MODENA_CENTER, zoom);

  const projected = points.map((point) => projectToWorldPixels(point, zoom));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function tileUrl(zoom: number, x: number, y: number) {
  const subdomain = TILE_SUBDOMAINS[(x + y) % TILE_SUBDOMAINS.length];
  return `https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function toPercent(value: number, total: number) {
  return Math.round((value / total) * 100_000) / 1000;
}

/**
 * Builds a static OpenStreetMap plate (same tiles as the site map) whose tiles
 * and markers are positioned in percentages of the plate, so it scales with
 * the page without a client-side map library.
 */
export function buildPrintMapPlate(
  points: PrintMapCoordinate[],
  options: PrintMapPlateOptions = printMapPlateOptions,
): PrintMapPlate {
  const zoom = resolveZoom(points, options);
  const center = resolveCenter(points, zoom);
  const width = mmToPixels(options.widthMm, options);
  const height = mmToPixels(options.heightMm, options);
  const originX = center.x - width / 2;
  const originY = center.y - height / 2;
  const tiles: PrintMapTile[] = [];

  for (let y = Math.floor(originY / TILE_SIZE_PX); y * TILE_SIZE_PX < originY + height; y += 1) {
    for (let x = Math.floor(originX / TILE_SIZE_PX); x * TILE_SIZE_PX < originX + width; x += 1) {
      tiles.push({
        url: tileUrl(zoom, x, y),
        left: toPercent(x * TILE_SIZE_PX - originX, width),
        top: toPercent(y * TILE_SIZE_PX - originY, height),
        width: toPercent(TILE_SIZE_PX, width),
        height: toPercent(TILE_SIZE_PX, height),
      });
    }
  }

  return {
    widthMm: options.widthMm,
    heightMm: options.heightMm,
    zoom,
    tiles,
    markers: points.map((point, index) => {
      const projected = projectToWorldPixels(point, zoom);
      return {
        label: String(index + 1).padStart(2, "0"),
        left: toPercent(projected.x - originX, width),
        top: toPercent(projected.y - originY, height),
      };
    }),
  };
}
