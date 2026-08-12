import { mapsGeocodingService } from "@/lib/server/modules/maps/geocoding/service";

describe("mapsGeocodingService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes Nominatim results into address suggestions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            { display_name: "Via Emilia Centro, Modena", lat: "44.647123", lon: "10.925234" },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(mapsGeocodingService.searchAddress("Via Emilia")).resolves.toEqual([
      { label: "Via Emilia Centro, Modena", latitude: 44.647123, longitude: 10.925234 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: "nominatim.openstreetmap.org" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
