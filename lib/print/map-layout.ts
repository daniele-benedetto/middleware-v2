export type PrintMapPointSource = {
  id: string;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  sortOrder: number;
};

export type PrintMapPoint = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
};

/** Maps geographic points into a padded print plate while preserving their relative position. */
export function buildPrintMapPoints(items: PrintMapPointSource[]): PrintMapPoint[] {
  const sortedItems = items.toSorted((left, right) => left.sortOrder - right.sortOrder);
  const coordinates = sortedItems.map((item) => ({
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
  }));
  const minLatitude = Math.min(...coordinates.map((coordinate) => coordinate.latitude));
  const maxLatitude = Math.max(...coordinates.map((coordinate) => coordinate.latitude));
  const minLongitude = Math.min(...coordinates.map((coordinate) => coordinate.longitude));
  const maxLongitude = Math.max(...coordinates.map((coordinate) => coordinate.longitude));
  const latitudeSpan = maxLatitude - minLatitude || 1;
  const longitudeSpan = maxLongitude - minLongitude || 1;

  return sortedItems.map((item, index) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    x: 14 + ((coordinates[index].longitude - minLongitude) / longitudeSpan) * 72,
    y: 86 - ((coordinates[index].latitude - minLatitude) / latitudeSpan) * 72,
  }));
}
