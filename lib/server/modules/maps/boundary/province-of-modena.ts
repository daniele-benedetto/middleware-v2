/**
 * Simplified Province of Modena administrative boundary, version 2026-08-11.
 * Source: OpenStreetMap relation 42884, fetched through Nominatim and simplified
 * with polygon_threshold=0.005. Coordinates are [longitude, latitude] in WGS84.
 */
export const provinceOfModenaBoundaryVersion = "2026-08-11";

type Position = readonly [longitude: number, latitude: number];

const provinceOfModenaPolygons: ReadonlyArray<ReadonlyArray<Position>> = [
  [
    [10.4698307, 44.2263518],
    [10.4933383, 44.2166395],
    [10.4853456, 44.2047038],
    [10.517132, 44.1830436],
    [10.5245983, 44.157241],
    [10.5771572, 44.1318626],
    [10.5933743, 44.1149943],
    [10.6242648, 44.120023],
    [10.6209226, 44.1405791],
    [10.6438463, 44.1601774],
    [10.6665953, 44.1515444],
    [10.6925277, 44.1577909],
    [10.7539757, 44.1542638],
    [10.7743007, 44.1341187],
    [10.8147436, 44.1154227],
    [10.803589, 44.1380328],
    [10.8062847, 44.1525302],
    [10.819543, 44.1683372],
    [10.8191817, 44.1799568],
    [10.8549761, 44.2070145],
    [10.8512825, 44.2287714],
    [10.8622499, 44.2331399],
    [10.8907016, 44.2254157],
    [10.8926243, 44.2137064],
    [10.9082338, 44.2063855],
    [10.9412893, 44.2265599],
    [10.9580522, 44.2269731],
    [10.9680738, 44.2440911],
    [10.9676471, 44.2707574],
    [10.9509053, 44.2941063],
    [11.0019246, 44.3060201],
    [11.008919, 44.2963337],
    [11.0396838, 44.3297096],
    [11.0358453, 44.3466818],
    [11.0236722, 44.3544607],
    [11.0223502, 44.373482],
    [11.0492031, 44.4056935],
    [11.0484457, 44.4161437],
    [11.0387441, 44.4274759],
    [10.9965635, 44.4295075],
    [10.9901343, 44.4403752],
    [11.0474798, 44.4660698],
    [11.0655487, 44.5004531],
    [11.0561875, 44.5131418],
    [11.0560854, 44.5340452],
    [11.0732129, 44.5222911],
    [11.0778027, 44.5314066],
    [11.108203, 44.524643],
    [11.1143705, 44.5360704],
    [11.1045651, 44.5394126],
    [11.1077992, 44.5450263],
    [11.1401992, 44.5846575],
    [11.1525186, 44.5865797],
    [11.1417875, 44.5928859],
    [11.1428055, 44.6056546],
    [11.1183317, 44.6178409],
    [11.1278279, 44.6312983],
    [11.0779754, 44.6469852],
    [11.1169487, 44.7098174],
    [11.1324778, 44.7863062],
    [11.2079521, 44.8042838],
    [11.2932295, 44.8029755],
    [11.3116206, 44.8273816],
    [11.366675, 44.8370097],
    [11.3557105, 44.8637896],
    [11.3061585, 44.8870945],
    [11.2399179, 44.9005497],
    [11.2386964, 44.9138904],
    [11.2605615, 44.9340795],
    [11.2465838, 44.9515335],
    [11.1524356, 44.9332445],
    [11.1180215, 44.9544667],
    [11.0733892, 44.9629506],
    [11.0589188, 44.9480876],
    [10.9971002, 44.9549206],
    [10.9681614, 44.9357279],
    [10.9516083, 44.9342575],
    [10.9423829, 44.9228586],
    [10.9179787, 44.9250781],
    [10.8889036, 44.9152141],
    [10.8799821, 44.9038635],
    [10.8793204, 44.8686822],
    [10.851079, 44.8674532],
    [10.8148889, 44.806789],
    [10.8422106, 44.7955102],
    [10.8156016, 44.7545511],
    [10.8148439, 44.7392105],
    [10.8215253, 44.7347757],
    [10.8064044, 44.6968957],
    [10.8214186, 44.69034],
    [10.812705, 44.6675169],
    [10.8197565, 44.6651429],
    [10.7961578, 44.6516188],
    [10.7820845, 44.628951],
    [10.7854221, 44.5998823],
    [10.7677355, 44.5436258],
    [10.7416601, 44.510799],
    [10.6595381, 44.4623694],
    [10.6569323, 44.4347997],
    [10.6288814, 44.4183704],
    [10.616787, 44.376553],
    [10.5883786, 44.3609921],
    [10.5280453, 44.3512561],
    [10.526355, 44.328951],
    [10.5114952, 44.3007093],
    [10.5170097, 44.2831349],
    [10.4879017, 44.2644141],
    [10.4857608, 44.2366145],
    [10.4698307, 44.2263518],
  ],
  [
    [10.4806956, 44.1902397],
    [10.480553, 44.1896472],
    [10.4808353, 44.1896201],
    [10.4806956, 44.1902397],
  ],
];

function isPointOnSegment(
  longitude: number,
  latitude: number,
  start: Position,
  end: Position,
): boolean {
  const [startLongitude, startLatitude] = start;
  const [endLongitude, endLatitude] = end;
  const cross =
    (longitude - startLongitude) * (endLatitude - startLatitude) -
    (latitude - startLatitude) * (endLongitude - startLongitude);

  if (Math.abs(cross) > Number.EPSILON) return false;

  return (
    longitude >= Math.min(startLongitude, endLongitude) &&
    longitude <= Math.max(startLongitude, endLongitude) &&
    latitude >= Math.min(startLatitude, endLatitude) &&
    latitude <= Math.max(startLatitude, endLatitude)
  );
}

function isInsidePolygon(latitude: number, longitude: number, polygon: ReadonlyArray<Position>) {
  let inside = false;

  for (let index = 0; index < polygon.length - 1; index += 1) {
    const current = polygon[index];
    const next = polygon[index + 1];

    if (isPointOnSegment(longitude, latitude, current, next)) return true;

    const intersects =
      current[1] > latitude !== next[1] > latitude &&
      longitude <
        ((next[0] - current[0]) * (latitude - current[1])) / (next[1] - current[1]) + current[0];
    if (intersects) inside = !inside;
  }

  return inside;
}

export function isWithinProvinceOfModena(latitude: number, longitude: number): boolean {
  return provinceOfModenaPolygons.some((polygon) => isInsidePolygon(latitude, longitude, polygon));
}
