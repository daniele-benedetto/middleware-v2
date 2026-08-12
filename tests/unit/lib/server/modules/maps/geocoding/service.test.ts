import { mapsGeocodingService } from "@/lib/server/modules/maps/geocoding/service";

describe("mapsGeocodingService", () => {
  afterEach(() => {
    delete process.env.NOMINATIM_USER_AGENT;
    vi.unstubAllGlobals();
  });

  it("normalizes Nominatim results within the Modena viewbox", async () => {
    process.env.NOMINATIM_USER_AGENT = "middleware-cms/1.0 (contact@example.com)";
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
    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get("viewbox")).toBe("10.7820845,44.7424432,11.0122721,44.5629531");
    expect(url.searchParams.get("bounded")).toBe("1");
  });

  it("returns a rate-limit error when Nominatim responds with 429", async () => {
    process.env.NOMINATIM_USER_AGENT = "middleware-cms/1.0 (contact@example.com)";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(mapsGeocodingService.searchAddress("Via Emilia")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
  });

  it("maps a provider rejection to an unavailable address search", async () => {
    process.env.NOMINATIM_USER_AGENT = "middleware.media/1.0 (+https://middleware.media)";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    await expect(mapsGeocodingService.searchAddress("Via Emilia")).rejects.toMatchObject({
      status: 502,
      code: "INTERNAL_ERROR",
    });
  });
});
