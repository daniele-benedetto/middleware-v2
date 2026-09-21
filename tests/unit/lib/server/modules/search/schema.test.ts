import { describe, expect, it } from "vitest";

import {
  publicSearchResponseDtoSchema,
  publicSearchSuggestionsDtoSchema,
} from "@/lib/server/modules/search/dto";
import {
  publicSearchInputSchema,
  publicSearchSuggestionsInputSchema,
} from "@/lib/server/modules/search/schema";

describe("public search contract", () => {
  it("requires at least two query characters", () => {
    expect(publicSearchInputSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(publicSearchInputSchema.parse({ q: "ab" })).toEqual({ q: "ab", limit: 10 });
  });

  it("validates a mixed result response with its total", () => {
    expect(
      publicSearchResponseDtoSchema.parse({
        total: 1,
        items: [
          {
            id: "article:1:/articoli/example",
            type: "article",
            title: "Example",
            href: "/articoli/example",
            snippet: "A <mark>match</mark>",
            publishedAt: "2026-09-18T00:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({ total: 1 });
  });

  it("limits suggestions to ten items and records their source", () => {
    expect(publicSearchSuggestionsInputSchema.parse({})).toEqual({ limit: 10 });
    expect(publicSearchSuggestionsInputSchema.safeParse({ limit: 11 }).success).toBe(false);
    expect(
      publicSearchSuggestionsDtoSchema.parse({
        source: "popular",
        items: [],
      }),
    ).toEqual({ source: "popular", items: [] });
  });
});
