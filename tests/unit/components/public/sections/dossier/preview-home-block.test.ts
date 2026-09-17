import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PreviewHomeBlock } from "@/components/public/sections/dossier/preview-home-block";

import type { PreviewHomeBlock as PreviewHomeBlockModel } from "@/components/public/home/home-view-model";

describe("PreviewHomeBlock", () => {
  it("uses the target issue variant without exposing its title", () => {
    const block: PreviewHomeBlockModel = {
      id: "preview",
      type: "preview",
      previewIssue: {
        id: "00000000-0000-4000-8000-000000000001",
        title: "Numero in arrivo",
        titleStyled: null,
        slug: "numero-in-arrivo",
        homeVariant: "red",
        article: {
          id: "00000000-0000-4000-8000-000000000002",
          slug: "articolo-in-arrivo",
          title: "Apertura in anteprima",
          titleStyled: null,
          excerpt: "Un articolo gia leggibile.",
          imageUrl: "/image.jpg",
          imageAlt: null,
          hasAudio: false,
          readingTimeMinutes: 4,
          publishedAt: "2026-01-01T00:00:00.000Z",
          categorySlug: "editoriale",
          categoryName: "Editoriale",
          authorName: null,
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(PreviewHomeBlock, { block, issueNumber: "N. 02" }),
    );

    expect(html).not.toContain("Numero in arrivo");
    expect(html).toContain("Apertura in anteprima");
    expect(html).toContain("N. 02");
    expect(html).toContain("bg-accent text-background");
    expect(html).toContain("relative isolate block overflow-hidden py-10 md:py-12");
    expect(html).toContain("absolute -top-10 right-5 -z-10");
    expect(html).toContain("/articoli/articolo-in-arrivo");
    expect(html).not.toContain("Nel prossimo numero");
    expect(html).toContain("Editoriale");
  });
});
