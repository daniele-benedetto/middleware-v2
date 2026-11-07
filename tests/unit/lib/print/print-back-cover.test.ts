import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrintBackCover } from "@/components/cms/print/print-back-cover";

import type { PrintBackCover as PrintBackCoverModel } from "@/lib/print/issue-document";

describe("printed next-issue article", () => {
  it("makes the full body available to the paginator without printing an issue number", () => {
    const backCover: PrintBackCoverModel = {
      anchor: "print-next-issue-test",
      label: "Editoriale",
      title: [{ text: "Il prossimo articolo", accent: false, breakAfter: false }],
      subtitle: null,
      image: null,
      plainTitle: "Il prossimo articolo",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Apertura dell’articolo." }] },
          { type: "paragraph", content: [{ type: "text", text: "Conclusione integrale." }] },
        ],
      },
      hasText: true,
      author: "Redazione",
      articlePath: "/articoli/prossimo-articolo",
      variant: "default",
      dark: false,
    };

    const html = renderToStaticMarkup(
      createElement(PrintBackCover, { backCover, qrCode: null, siteLabel: "middleware.media" }),
    );

    expect(html).toContain('data-print-label="Nel prossimo numero"');
    expect(html).toContain("Apertura dell’articolo.");
    expect(html).toContain("Conclusione integrale.");
    expect(html).toContain('data-print-fit-pages="1"');
    expect(html).toContain('data-print-fit-text=""');
    expect(html).not.toContain("back-cover__logo");
    expect(html).not.toContain("print-footer-qr");
    expect(html).not.toContain("article__image");
  });

  it("opens with the article photo, black and white only when its settings ask for it", () => {
    const base: PrintBackCoverModel = {
      anchor: "print-next-issue-test",
      label: "Editoriale",
      title: [{ text: "Il prossimo articolo", accent: false, breakAfter: false }],
      subtitle: null,
      image: {
        url: "/api/cms/media/blob?pathname=prossimo.jpg",
        alt: "Corteo",
        settings: { grayscale: false, fit: "contain", positionX: 0, positionY: 100, zoom: 120 },
      },
      plainTitle: "Il prossimo articolo",
      content: null,
      hasText: true,
      author: "Redazione",
      articlePath: "/articoli/prossimo-articolo",
      variant: "default",
      dark: false,
    };
    const render = (backCover: PrintBackCoverModel) =>
      renderToStaticMarkup(
        createElement(PrintBackCover, { backCover, qrCode: null, siteLabel: "middleware.media" }),
      );

    const colour = render(base);
    expect(colour).toContain('<figure class="article__image"><img src=');
    expect(colour).toContain('alt="Corteo"');
    expect(colour).not.toContain("print-image--grayscale");
    expect(colour).toContain("object-fit:contain;object-position:0% 100%;transform:scale(1.2)");

    const image = base.image!;
    expect(
      render({ ...base, image: { ...image, settings: { ...image.settings, grayscale: true } } }),
    ).toContain('class="print-image--grayscale"');
  });
});
