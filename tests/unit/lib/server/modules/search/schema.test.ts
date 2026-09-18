import { describe, expect, it } from "vitest";

import { publicSearchResponseDtoSchema } from "@/lib/server/modules/search/dto";
import { publicSearchInputSchema } from "@/lib/server/modules/search/schema";

describe("public search contract", () => {
  it("requires at least two query characters", () => {
    expect(publicSearchInputSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(publicSearchInputSchema.parse({ q: "ab" })).toEqual({ q: "ab", limit: 12 });
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
});
