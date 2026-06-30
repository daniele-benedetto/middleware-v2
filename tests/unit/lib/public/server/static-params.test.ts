import { describe, expect, it } from "vitest";

import {
  EMPTY_PUBLIC_STATIC_PARAM_SLUG,
  ensureNonEmptyStaticParams,
} from "@/lib/public/server/static-params";

describe("ensureNonEmptyStaticParams", () => {
  it("returns existing params unchanged", () => {
    const params = [{ slug: "published-article" }];

    expect(ensureNonEmptyStaticParams(params)).toBe(params);
  });

  it("returns a placeholder param when the source is empty", () => {
    expect(ensureNonEmptyStaticParams([])).toEqual([{ slug: EMPTY_PUBLIC_STATIC_PARAM_SLUG }]);
  });
});
