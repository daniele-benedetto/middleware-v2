import { normalizeMapCoordinates } from "@/features/cms/maps/utils/coordinates";

describe("normalizeMapCoordinates", () => {
  it("rounds Leaflet coordinates to the database precision", () => {
    expect(normalizeMapCoordinates(44.64712349, 10.92523451)).toEqual({
      latitude: 44.647123,
      longitude: 10.925235,
    });
  });
});
