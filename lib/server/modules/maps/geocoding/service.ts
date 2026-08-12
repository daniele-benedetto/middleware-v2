import "server-only";

import { z } from "zod";

import { ApiError } from "@/lib/server/http/api-error";

export const mapAddressSuggestionDtoSchema = z.object({
  label: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const nominatimResponseSchema = z.array(
  z.object({
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
  }),
);

async function searchNominatim(query: string) {
  const userAgent = process.env.NOMINATIM_USER_AGENT?.trim();
  if (!userAgent) {
    throw new ApiError(503, "INTERNAL_ERROR", "Address search is not configured");
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "5",
    countrycodes: "it",
    // Nominatim expects west,north,east,south; the previous order excluded Modena.
    viewbox: "10.7820845,44.7424432,11.0122721,44.5629531",
    bounded: "1",
  }).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "it",
        "User-Agent": userAgent,
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new ApiError(502, "INTERNAL_ERROR", "Address search is unavailable");
  }
  if (response.status === 429) {
    throw new ApiError(429, "RATE_LIMITED", "Address search is temporarily rate limited");
  }
  if (response.status === 403) {
    throw new ApiError(502, "INTERNAL_ERROR", "Address search was rejected by its provider");
  }
  if (!response.ok) throw new ApiError(502, "INTERNAL_ERROR", "Address search is unavailable");

  const parsed = nominatimResponseSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new ApiError(502, "INTERNAL_ERROR", "Address search returned an invalid response");
  return parsed.data
    .map((result) => ({
      label: result.display_name,
      longitude: Number(result.lon),
      latitude: Number(result.lat),
    }))
    .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));
}

export const mapsGeocodingService = {
  searchAddress(query: string) {
    return searchNominatim(query);
  },
};
