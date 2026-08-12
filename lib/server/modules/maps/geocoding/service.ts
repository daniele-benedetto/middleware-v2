import "server-only";

import { z } from "zod";

import { ApiError } from "@/lib/server/http/api-error";

const nominatimResultSchema = z.object({
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
});

const nominatimResponseSchema = z.array(nominatimResultSchema);

export const mapAddressSuggestionDtoSchema = z.object({
  label: z.string(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

async function searchNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "5",
    addressdetails: "1",
  }).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "it",
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "middleware-cms/1.0",
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new ApiError(502, "INTERNAL_ERROR", "Address search is unavailable");
  }

  if (!response.ok) {
    throw new ApiError(502, "INTERNAL_ERROR", "Address search is unavailable");
  }

  const parsed = nominatimResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError(502, "INTERNAL_ERROR", "Address search returned an invalid response");
  }

  return parsed.data
    .map((result) => ({
      label: result.display_name,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    }))
    .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));
}

export const mapsGeocodingService = {
  searchAddress(query: string) {
    return searchNominatim(query);
  },
};
