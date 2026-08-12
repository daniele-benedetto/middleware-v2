import { isWithinProvinceOfModena } from "@/lib/server/modules/maps/boundary/province-of-modena";
import {
  createMapInputSchema,
  createMapItemInputSchema,
  updateMapItemInputSchema,
} from "@/lib/server/modules/maps/schema";

const mapId = "00000000-0000-4000-8000-000000000001";

describe("maps schemas", () => {
  it("requires a non-blank map title and accepts an optional description", () => {
    expect(createMapInputSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      createMapInputSchema.safeParse({
        title: "Mappa di Modena",
        titleStyled: [
          { text: "Mappa", tone: "primary" },
          { text: "di Modena", breakAfter: true },
        ],
        descriptionRich: { type: "doc", content: [{ type: "paragraph" }] },
        initialItem: {
          title: "Mappa di Modena",
          latitude: 44.6471,
          longitude: 10.9252,
        },
      }).success,
    ).toBe(true);
  });

  it("accepts Modena coordinates and rejects global coordinate ranges", () => {
    expect(
      createMapItemInputSchema.safeParse({
        mapId,
        title: "Centro",
        latitude: 44.6471,
        longitude: 10.9252,
      }).success,
    ).toBe(true);
    expect(
      createMapItemInputSchema.safeParse({
        mapId,
        title: "Invalid",
        latitude: 91,
        longitude: 10.9252,
      }).success,
    ).toBe(false);
    expect(
      createMapItemInputSchema.safeParse({
        mapId,
        title: "Invalid",
        latitude: 44.6471234,
        longitude: 10.9252,
      }).success,
    ).toBe(false);
  });

  it("enforces the Province of Modena boundary when both update coordinates are present", () => {
    expect(isWithinProvinceOfModena(44.6471, 10.9252)).toBe(true);
    expect(isWithinProvinceOfModena(44.4949, 11.3426)).toBe(false);
    const result = updateMapItemInputSchema.safeParse({ latitude: 44.4949, longitude: 11.3426 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["latitude"],
        message: "Coordinates must be within the Province of Modena boundary",
      });
    }
  });
});
