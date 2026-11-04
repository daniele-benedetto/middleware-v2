import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrintToc } from "@/components/cms/print/print-toc";

import type { PrintBackCover } from "@/lib/print/issue-document";

const backCover: PrintBackCover = {
  anchor: "print-next-issue-example",
  label: "Editoriale",
  title: [{ text: "La prossima inchiesta", accent: false, breakAfter: false }],
  subtitle: null,
  plainTitle: "La prossima inchiesta",
  content: null,
  hasText: true,
  author: "Redazione",
  articlePath: "/articoli/la-prossima-inchiesta",
  variant: "default",
  dark: false,
};

describe("PrintToc", () => {
  it("includes the anticipation and points to its opening page", () => {
    const html = renderToStaticMarkup(createElement(PrintToc, { sections: [], backCover }));

    expect(html).not.toContain("Nel prossimo numero");
    expect(html).toContain("La prossima inchiesta");
    expect(html).toContain('data-print-ref="print-next-issue-example"');
    expect(html).not.toContain("Nessun contenuto assegnato");
  });
});
