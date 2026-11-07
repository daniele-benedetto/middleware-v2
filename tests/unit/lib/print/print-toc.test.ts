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
  image: null,
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
    const html = renderToStaticMarkup(
      createElement(PrintToc, { sections: [], backCover, colophon: null }),
    );

    expect(html).not.toContain("Nel prossimo numero");
    expect(html).toContain("La prossima inchiesta");
    expect(html).toContain('data-print-ref="print-next-issue-example"');
    expect(html).not.toContain("Nessun contenuto assegnato");
    expect(html).toContain('<p class="toc__kicker">In questo numero</p>');
    expect(html).not.toContain("toc__thanks");
    expect(html).not.toContain("toc__quote");
  });

  it("closes the index with the menu quote and the acknowledgements", () => {
    const html = renderToStaticMarkup(
      createElement(PrintToc, {
        sections: [],
        backCover,
        colophon: {
          quote: [
            [
              { text: "La conoscenza è legata alla ", accent: false },
              { text: "lotta", accent: true },
              { text: ".", accent: false },
            ],
            [
              { text: "Conosce veramente chi veramente ", accent: false },
              { text: "odia", accent: true },
              { text: ".", accent: false },
            ],
          ],
          acknowledgements: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Grazie a tutte." }] }],
          },
          acknowledgementsText: "Grazie a tutte.",
        },
      }),
    );

    expect(html).toContain(
      '<blockquote class="toc__quote"><span>La conoscenza è legata alla <span class="accent">lotta</span>.</span><span><br/>Conosce veramente chi veramente <span class="accent">odia</span>.</span></blockquote>',
    );
    expect(html).toContain("Ringraziamenti");
    expect(html).toContain("Grazie a tutte.");
    expect(html.indexOf("toc__list")).toBeLessThan(html.indexOf("toc__thanks"));
    expect(html.indexOf("toc__thanks")).toBeLessThan(html.indexOf("toc__quote"));
    expect(html).toContain('<footer class="toc__closing"><blockquote class="toc__quote">');
  });
});
