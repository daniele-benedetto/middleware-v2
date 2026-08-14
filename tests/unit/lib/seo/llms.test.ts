import { describe, expect, it } from "vitest";

import { buildLlmsTxt } from "@/lib/seo";

describe("llms.txt", () => {
  it("publishes the canonical editorial entry points", () => {
    const content = buildLlmsTxt();

    expect(content).toContain("# middleware");
    expect(content).toContain("http://localhost:3000/articoli");
    expect(content).toContain("http://localhost:3000/uscite");
    expect(content).toContain("http://localhost:3000/contro-formazione");
    expect(content).toContain("http://localhost:3000/feed.xml");
  });
});
