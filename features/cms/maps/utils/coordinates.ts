export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export function normalizeMapCoordinates(latitude: number, longitude: number): MapCoordinates {
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}
