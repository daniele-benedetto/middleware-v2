import { describe, expect, it } from "vitest";

import { protectPrintTitleCompounds } from "@/lib/print/title-compounds";

describe("protectPrintTitleCompounds", () => {
  it("keeps a compound place name on one line without changing its visible spelling", () => {
    const title = "Perché un’inchiesta nella Sacca-Crocetta?";
    const protectedTitle = protectPrintTitleCompounds(title);

    expect(protectedTitle).toContain("Sacca\u2060-\u2060Crocetta");
    expect(protectedTitle.replaceAll("\u2060", "")).toBe(title);
  });

  it("leaves words too long for the page free to wrap", () => {
    expect(protectPrintTitleCompounds("supercalifragilistico-lunghissimo")).toBe(
      "supercalifragilistico-lunghissimo",
    );
  });
});
