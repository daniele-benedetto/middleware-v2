import { extractPrintReadingBlocks } from "@/lib/print/reading-blocks";

import type { PrintEditionManifest, PrintSequenceItem } from "@/lib/print/manifest";
import type { PrintReadingBlock } from "@/lib/print/reading-blocks";

export type EditionArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  contentRich: unknown;
};

export type EditionPage = {
  number: number;
  itemId: string;
  family: PrintSequenceItem["preferredFamily"];
  title: string;
  section: PrintSequenceItem["section"];
  authorName?: string | null;
  excerpt?: string | null;
  blocks: PrintReadingBlock[];
  selectedImageUrl?: string | null;
};

export type EditionComposition = {
  pages: EditionPage[];
  warnings: string[];
};

export type EditionIndexEntry = {
  itemId: string;
  title: string;
  page: number;
  section: PrintSequenceItem["section"];
};

// Conservative typographic budget for the A4 two-column proof. Physical overflow
// still needs measurement in a browser before this can become a press-ready PDF.
const OPENER_BUDGET = 90;
const READING_BUDGET = 300;

function cost(block: PrintReadingBlock): number {
  if (block.kind === "image") return 170;
  const words = block.text.trim().split(/\s+/).length;
  return words + (block.kind === "heading" ? 35 : block.kind === "quote" ? 25 : 10);
}

function splitLongBlock(block: PrintReadingBlock, maxWords: number): PrintReadingBlock[] {
  if (block.kind === "image") return [block];
  const words = block.text.split(/\s+/);
  if (words.length <= maxWords) return [block];
  const parts: PrintReadingBlock[] = [];
  for (let start = 0; start < words.length; start += maxWords) {
    parts.push({ ...block, text: words.slice(start, start + maxWords).join(" ") });
  }
  return parts;
}

function composeArticle(
  item: PrintSequenceItem,
  article: EditionArticle,
  startNumber: number,
  warnings: string[],
): EditionPage[] {
  const { blocks, unsupported } = extractPrintReadingBlocks(article.contentRich);
  for (const type of unsupported)
    warnings.push(`${article.title}: ${type} da impaginare manualmente.`);
  if (blocks.length === 0) warnings.push(`${article.title}: testo mancante.`);

  const pages: EditionPage[] = [];
  const segments = blocks.flatMap((block) => splitLongBlock(block, 185));
  let current: PrintReadingBlock[] = [];
  let budget = item.preferredFamily === "article-opener" ? OPENER_BUDGET : READING_BUDGET;
  let used = 0;

  function flush() {
    pages.push({
      number: startNumber + pages.length,
      itemId: item.id,
      family: pages.length === 0 ? item.preferredFamily : "article-continuation",
      title: article.title,
      section: item.section,
      authorName: article.authorName,
      excerpt: article.excerpt,
      blocks: current,
      selectedImageUrl: pages.length === 0 ? item.selectedImageUrl : undefined,
    });
    current = [];
    budget = READING_BUDGET;
    used = 0;
  }

  for (const segment of segments) {
    const weight = cost(segment);
    if (current.length > 0 && used + weight > budget) flush();
    current.push(segment);
    used += weight;
  }
  if (current.length > 0 || pages.length === 0) flush();
  return pages;
}

export function composePrintEdition(
  manifest: PrintEditionManifest,
  articles: EditionArticle[],
): EditionComposition {
  const byId = new Map(articles.map((article) => [article.id, article]));
  const pages: EditionPage[] = [
    {
      number: 1,
      itemId: "cover",
      family: "cover",
      title: manifest.title,
      section: "opening",
      blocks: [],
    },
    {
      number: 2,
      itemId: "index",
      family: "index",
      title: "Indice",
      section: "opening",
      blocks: [],
    },
  ];
  const warnings: string[] = [];

  for (const item of manifest.items) {
    const nextPage = pages.length + 1;
    if (item.lockedPage !== undefined) {
      if (item.lockedPage < nextPage) {
        warnings.push(
          `${item.title}: impossibile iniziare alla pagina ${item.lockedPage}; la prima disponibile è ${nextPage}.`,
        );
      } else {
        while (pages.length + 1 < item.lockedPage) {
          pages.push({
            number: pages.length + 1,
            itemId: `blank:before:${item.id}:${pages.length + 1}`,
            family: "blank",
            title: "Pagina di rispetto",
            section: "special",
            blocks: [],
          });
        }
      }
    } else if (item.startsOnRight && nextPage % 2 === 0) {
      pages.push({
        number: nextPage,
        itemId: `blank:before:${item.id}:${nextPage}`,
        family: "blank",
        title: "Pagina di rispetto",
        section: "special",
        blocks: [],
      });
    }

    if (item.kind === "article") {
      const article = byId.get(item.id);
      if (!article) {
        warnings.push(`${item.title}: articolo non disponibile per la stampa.`);
        continue;
      }
      pages.push(...composeArticle(item, article, pages.length + 1, warnings));
    } else {
      pages.push({
        number: pages.length + 1,
        itemId: item.id,
        family: item.preferredFamily,
        title: item.title,
        section: item.section,
        blocks: [],
        selectedImageUrl: item.selectedImageUrl,
      });
      if (item.kind === "map") warnings.push(`${item.title}: tavola cartografica da preparare.`);
      if (item.kind === "questionnaireAnalysis") {
        warnings.push(`${item.title}: grafici statici da preparare.`);
      }
    }
  }
  if (pages.length % manifest.pageCountMultiple !== 0) {
    const padding = manifest.pageCountMultiple - (pages.length % manifest.pageCountMultiple);
    warnings.push(
      `Aggiunte ${padding} pagine bianche per chiudere il numero a ${
        pages.length + padding
      } pagine.`,
    );
    for (let index = 0; index < padding; index += 1) {
      pages.push({
        number: pages.length + 1,
        itemId: `blank:${index + 1}`,
        family: "blank",
        title: "Pagina bianca",
        section: "closing",
        blocks: [],
      });
    }
  }
  return { pages, warnings };
}

export function buildEditionIndex(pages: EditionPage[]): EditionIndexEntry[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => {
    if (page.itemId === "cover" || page.itemId === "index" || page.family === "blank") return [];
    if (seen.has(page.itemId)) return [];
    seen.add(page.itemId);
    return [{ itemId: page.itemId, title: page.title, page: page.number, section: page.section }];
  });
}
