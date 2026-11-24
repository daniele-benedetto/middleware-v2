import { describe, expect, it } from "vitest";

import { articleSearchMeta } from "@/lib/server/modules/search/projection/article-meta";

describe("articleSearchMeta", () => {
  it("lists category, author, publication date and audio in reading order", () => {
    expect(
      articleSearchMeta({
        categoryName: "Inchiesta",
        authorName: "Redazione",
        publishedAt: new Date("2026-11-03T11:51:39.566Z"),
        hasAudio: true,
      }),
    ).toEqual(["Inchiesta", "Redazione", "3 novembre 2026", "Versione audio"]);
  });

  it("omits missing author, date and audio", () => {
    expect(
      articleSearchMeta({
        categoryName: "Inchiesta",
        authorName: null,
        publishedAt: null,
        hasAudio: false,
      }),
    ).toEqual(["Inchiesta"]);
  });

  it("formats the date in the Italian time zone", () => {
    expect(
      articleSearchMeta({
        categoryName: "Inchiesta",
        authorName: null,
        publishedAt: new Date("2026-07-31T23:30:00.000Z"),
        hasAudio: false,
      }),
    ).toEqual(["Inchiesta", "1 agosto 2026"]);
  });
});
