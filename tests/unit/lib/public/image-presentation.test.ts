import {
  getEditorialImageFilterClass,
  getEditorialImageStyle,
} from "@/lib/public/format/image-presentation";

describe("editorial image presentation", () => {
  it("uses the persisted focal point and selected color treatment", () => {
    expect(
      getEditorialImageStyle({
        imageFocalX: 22,
        imageFocalY: 78,
        imageFilter: "COLOR",
        imageZoom: 1.4,
      }),
    ).toEqual({
      objectPosition: "22% 78%",
      transform: "scale(1.4)",
      transformOrigin: "22% 78%",
    });
    expect(getEditorialImageFilterClass({ imageFilter: "COLOR" })).toBeUndefined();
  });

  it("keeps legacy images centered and in grayscale", () => {
    expect(getEditorialImageStyle({})).toEqual({
      objectPosition: "50% 50%",
      transform: "scale(1)",
      transformOrigin: "50% 50%",
    });
    expect(getEditorialImageFilterClass({ imageFilter: "GRAYSCALE" })).toBe("grayscale");
  });
});
