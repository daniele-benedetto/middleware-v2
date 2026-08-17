import {
  defaultPublicImageSettings,
  resolvePublicImageSettings,
} from "@/lib/public/image-settings";

describe("resolvePublicImageSettings", () => {
  it("fills omitted properties with public defaults", () => {
    expect(resolvePublicImageSettings({ fit: "contain", zoom: 125 })).toEqual({
      grayscale: true,
      fit: "contain",
      positionX: 50,
      positionY: 50,
      zoom: 125,
    });
  });

  it("falls back to defaults when any persisted value is invalid", () => {
    expect(resolvePublicImageSettings({ positionX: 120 })).toBe(defaultPublicImageSettings);
  });
});
