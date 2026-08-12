import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClosingBlock } from "@/components/public/sections/dossier/closing-block";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

const article = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "articolo-finale",
  title: "Articolo finale",
  titleStyled: null,
  excerpt: "Una sintesi conclusiva.",
  imageUrl: "/image.jpg",
  imageAlt: null,
  hasAudio: false,
  readingTimeMinutes: 5,
  publishedAt: "2026-01-01T00:00:00.000Z",
  categorySlug: "categoria",
  categoryName: "Categoria",
  authorName: null,
};

describe("ClosingBlock", () => {
  it("renders separate, variant-colored closing columns", () => {
    const block: NarrativeHomeBlock = {
      id: "closing",
      type: "closing",
      articles: [article],
      featuredArticle: article,
      featuredPlacement: "left",
    };

    const html = renderToStaticMarkup(
      createElement(ClosingBlock, {
        block,
        variant: "red",
        articleNumbers: new Map([[article.id, 1]]),
      }),
    );

    expect(html).toContain("grid md:grid-cols-2 md:gap-8 lg:gap-10");
    expect(html).toContain("bg-accent text-background");
    expect(html).toContain("url=%2Fimage.jpg");
    expect(html).toContain("closing-article-title-00000000-0000-4000-8000-000000000001");
    expect(html).not.toContain("md:min-h-[min(58vh,560px)]");
    expect(html).not.toContain("md:border-r");
    expect(html).not.toContain("md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]");
    expect(html).not.toContain("Una traccia conclusiva del percorso.");
  });
});
