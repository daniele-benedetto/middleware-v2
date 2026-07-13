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
  it("renders no-copy closing blocks with an image-led closing layout", () => {
    const block: NarrativeHomeBlock = {
      id: "closing",
      type: "closing",
      title: null,
      titleStyled: null,
      description: null,
      articles: [article],
      featuredArticle: article,
      featuredPlacement: "left",
    };

    const html = renderToStaticMarkup(
      createElement(ClosingBlock, {
        block,
        variant: "default",
        articleNumbers: new Map([[article.id, 1]]),
      }),
    );

    expect(html).toContain("md:grid-cols-[minmax(260px,0.46fr)_minmax(0,0.54fr)]");
    expect(html).toContain("aspect-[4/3] overflow-hidden bg-foreground p-3 md:aspect-auto");
    expect(html).toContain("url=%2Fimage.jpg");
    expect(html).toContain("closing-article-title-00000000-0000-4000-8000-000000000001");
    expect(html).not.toContain("md:min-h-[min(58vh,560px)]");
    expect(html).not.toContain("border-t border-foreground py-10");
    expect(html).not.toContain("md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]");
    expect(html).not.toContain("Una traccia conclusiva del percorso.");
  });
});
