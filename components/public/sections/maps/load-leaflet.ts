import "@/components/maps/leaflet.css";

/**
 * Loads Leaflet together with its stylesheet. Importing this module lazily
 * (`import("./load-leaflet")`) keeps both the library and its CSS out of the
 * initial page bundle; the CSS chunk is in place before Leaflet builds the map.
 */
export function loadLeaflet() {
  return import("leaflet");
}
