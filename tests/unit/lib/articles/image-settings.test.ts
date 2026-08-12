import { describe, expect, it } from "vitest";

import {
  defaultArticleImageSettings,
  resolveArticleImageSettings,
} from "@/lib/articles/image-settings";

describe("resolveArticleImageSettings", () => {
  it("uses the existing black-and-white cover treatment by default", () => {
    expect(resolveArticleImageSettings(null)).toEqual(defaultArticleImageSettings);
  });

  it("accepts valid display settings", () => {
    expect(
      resolveArticleImageSettings({
        grayscale: false,
        fit: "contain",
        positionX: 0,
        positionY: 100,
        zoom: 125,
      }),
    ).toEqual({
      grayscale: false,
      fit: "contain",
      positionX: 0,
      positionY: 100,
      zoom: 125,
    });
  });

  it("falls back when persisted settings are invalid", () => {
    expect(resolveArticleImageSettings({ zoom: 300 })).toEqual(defaultArticleImageSettings);
  });
});
