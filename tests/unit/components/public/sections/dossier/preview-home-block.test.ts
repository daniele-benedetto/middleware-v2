import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PreviewHomeBlock } from "@/components/public/sections/dossier/preview-home-block";

import type { PreviewHomeBlock as PreviewHomeBlockModel } from "@/components/public/home/home-view-model";

describe("PreviewHomeBlock", () => {
  it("uses the lead composition with a distinct dynamic issue signature", () => {
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

    const html = renderToStaticMarkup(createElement(PreviewHomeBlock, { block }));

    expect(html).not.toContain("Numero in arrivo");
    expect(html).toContain("Apertura in anteprima");
    expect(html).toContain("bg-accent text-background");
    expect(html).toContain("md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]");
    expect(html).toContain("/articoli/articolo-in-arrivo");
    expect(html).not.toContain("Nel prossimo numero");
  });
});
