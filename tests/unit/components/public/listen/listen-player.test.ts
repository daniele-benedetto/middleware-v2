import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ListenCover } from "@/components/public/listen/listen-cover";
import { ListenInfo } from "@/components/public/listen/listen-info";
import { ListenPlayer } from "@/components/public/listen/listen-player";

import type { AudioChunk } from "@/lib/audio/audio-chunks";

const chunks: AudioChunk[] = [
  { id: "0", text: "Prima frase.", start: 0, end: 2, confidence: null },
  { id: "1", text: "Seconda frase.", start: 2, end: 5, confidence: null },
  { id: "2", text: "Terza frase.", start: 5, end: 9, confidence: null },
];

function renderPlayer(overrides: Partial<Parameters<typeof ListenPlayer>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(ListenPlayer, {
      contentKind: "article",
      contentId: "article-1",
      contentSlug: "articolo",
      contentTitle: "Articolo",
      contentUpdatedAt: "2026-11-01T00:00:00.000Z",
      audioUrl: "/api/public/media/blob?pathname=articolo.mp3",
      chunks,
      emptyState: createElement("p", null, "Nessun testo"),
      cover: createElement("span", null, "COVER"),
      info: createElement("span", null, "INFO"),
      ...overrides,
    }),
  );
}

describe("ListenPlayer", () => {
  it("lays out cover, info, the whole synced text and the controls", () => {
    const html = renderPlayer();

    expect(html).toContain("COVER");
    expect(html).toContain("INFO");
    for (const chunk of chunks) expect(html).toContain(chunk.text);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true"[^>]*>Prima frase\./);
    expect(html).toContain('aria-label="Controlli audio"');
    expect(html).toContain("[grid-template-areas:&#x27;cover_info&#x27;");
  });

  it("shows the empty state without a transcript", () => {
    expect(renderPlayer({ chunks: [] })).toContain("Nessun testo");
  });
});

describe("ListenInfo", () => {
  it("renders the title as the page heading with kicker, meta and the way back", () => {
    const html = renderToStaticMarkup(
      createElement(ListenInfo, {
        kicker: [
          { key: "issue", label: "Numero zero", href: "/uscite/numero-zero" },
          { key: "category", label: "Editoriale" },
        ],
        title: "Titolo dell'articolo",
        titleStyled: null,
        meta: [{ key: "date", label: "luglio 2026", dateTime: "2026-07-01T00:00:00.000Z" }],
        backLink: { href: "/articoli/titolo", label: "Torna all'articolo" },
      }),
    );

    expect(html).toMatch(/<h1[^>]*>.*Titolo dell(&#x27;|')articolo/);
    expect(html).toContain('href="/uscite/numero-zero"');
    expect(html).toContain(" · ");
    expect(html).toContain('<time dateTime="2026-07-01T00:00:00.000Z">luglio 2026</time>');
    expect(html).toContain('href="/articoli/titolo"');
  });
});

describe("ListenCover", () => {
  it("falls back to the brand pictogram without a photo", () => {
    const html = renderToStaticMarkup(
      createElement(ListenCover, { imageUrl: null, imageAlt: null }),
    );

    expect(html).toContain("middleware-pictogram-red.png");
  });
});
