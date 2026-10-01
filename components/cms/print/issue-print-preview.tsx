import {
  BarChart3,
  FileText,
  GraduationCap,
  Map as MapIcon,
  MessageCircle,
  Pencil,
  Search,
  Mic,
} from "lucide-react";
import QRCode from "qrcode";

import { MagazineCover } from "@/components/cms/print/magazine-cover";
import { PrintMapSpread } from "@/components/cms/print/print-map-spread";
import { PrintPreviewActions } from "@/components/cms/print/print-preview-actions";
import { PrintRichText } from "@/components/cms/print/print-rich-text";
import { extractCmsMediaPathname, resolveCmsMediaPreviewUrl } from "@/lib/media/blob";
import { splitPrintContentByCapacity } from "@/lib/print/content";
import {
  buildIssuePrintSequence,
  type IssuePrintItem,
  type IssuePrintSpecialItem,
} from "@/lib/print/issue-view-model";

import type { IssueDetail } from "@/features/cms/issues/hooks/use-issue-crud";
import type { RouterOutputs } from "@/lib/trpc/types";

type Article = RouterOutputs["articles"]["getById"];
type PrintMap = RouterOutputs["maps"]["getById"];

type IssuePrintPreviewProps = {
  issue: IssueDetail;
  articles: Article[];
  maps: PrintMap[];
  issueNumber: string;
  embedded?: boolean;
  resourceTitles?: Record<string, string>;
};

function IndexIcon({ item }: { item: IssuePrintItem }) {
  const Icon =
    item.type === "opening" || item.type === "closing"
      ? Pencil
      : item.type === "body"
        ? Mic
        : item.type === "rupture"
          ? Search
          : item.type === "map"
            ? MapIcon
            : item.type === "questionnaireAnalysis"
              ? BarChart3
              : item.type === "course"
                ? GraduationCap
                : item.type === "preview"
                  ? FileText
                  : MessageCircle;

  return <Icon className="print-v3-index-icon" aria-hidden="true" />;
}

function blockLabel(type: string) {
  return (
    {
      opening: "Editoriale",
      body: "Contributi",
      rupture: "Approfondimenti",
      closing: "Editoriale",
      course: "Contro-formazione",
      map: "Mappatura",
      questionnaireAnalysis: "Raccolta dati",
      preview: "Anteprima",
    }[type] ?? type
  );
}

function itemTitle(item: IssuePrintItem, resourceTitles: Record<string, string>) {
  return item.kind === "article"
    ? item.article.title
    : (resourceTitles[item.resourceId ?? ""] ?? blockLabel(item.type));
}

function PrintIndex({
  items,
  resourceTitles,
}: {
  items: IssuePrintItem[];
  resourceTitles: Record<string, string>;
}) {
  return (
    <section className="print-v3-page print-v3-index" aria-label="02 Indice">
      <div className="print-v3-index-content">
        <h2>Indice</h2>
        <ol className="print-v3-index-list">
          {items.map((item) => (
            <li key={item.kind === "article" ? item.article.id : item.id}>
              <span className="print-v3-index-type">
                <IndexIcon item={item} />
              </span>
              <span className="print-v3-index-title">{itemTitle(item, resourceTitles)}</span>
              <span className="print-v3-index-page">{String(item.page).padStart(2, "0")}</span>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="print-v3-index-empty">Nessun contenuto assegnato.</li>
          ) : null}
        </ol>
        <span className="print-v3-folio">02</span>
      </div>
    </section>
  );
}

type PrintArticleItem = Extract<IssuePrintItem, { kind: "article" }>;

function PrintTitle({ item }: { item: PrintArticleItem }) {
  return (
    <h1>
      {(item.article.titleStyled?.length
        ? item.article.titleStyled
        : [{ text: item.article.title, tone: "default" as const }]
      ).map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          className={segment.tone === "primary" ? "print-v3-title-primary" : undefined}
        >
          {index > 0 && item.article.titleStyled?.[index - 1]?.breakAfter
            ? segment.text.trimStart()
            : segment.text}
          {segment.breakAfter ? <br /> : null}
        </span>
      ))}
    </h1>
  );
}

function PrintArticle({
  item,
  content,
  continuation = false,
  pageNumber,
}: {
  item: PrintArticleItem;
  content: unknown;
  continuation?: boolean;
  pageNumber: number;
}) {
  const variant =
    item.type === "opening" || item.type === "rupture" || item.type === "closing"
      ? item.type
      : "body";
  const hasImage = Boolean(item.article.imageUrl);

  return (
    <article
      className={`print-v3-page print-v3-article print-v3-article--${variant}${continuation ? " print-v3-article--continuation" : ""}${hasImage ? " print-v3-article--has-image" : ""}`}
      data-article-id={item.article.id}
      data-featured-placement={item.article.featuredPlacement ?? "left"}
    >
      {!continuation && item.article.imageUrl && item.type !== "body" ? (
        <figure className="print-v3-article__image">
          {/* CMS media is authenticated and cannot use the public Next Image loader. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveCmsMediaPreviewUrl(item.article.imageUrl)}
            alt={item.article.imageAlt ?? item.article.title}
          />
        </figure>
      ) : null}
      {!continuation ? (
        <header className="print-v3-article__header">
          <PrintTitle item={item} />
          {item.article.excerpt ? (
            <p className="print-v3-article__deck">{item.article.excerpt}</p>
          ) : null}
          <div className="print-v3-article__byline">
            <span>{blockLabel(item.type)}</span>
            <span className="print-v3-article__meta-divider" aria-hidden="true" />
            <span>{item.article.authorName ?? "Middleware"}</span>
          </div>
        </header>
      ) : null}
      <PrintRichText value={content} />
      <span className="print-v3-article__folio">{String(pageNumber).padStart(2, "0")}</span>
    </article>
  );
}

function printContentPages(item: PrintArticleItem) {
  const firstPageCharacters = item.type === "body" ? 4200 : 1400;
  return splitPrintContentByCapacity(item.article.contentRich, firstPageCharacters, 6000);
}

type PrintPage =
  | {
      kind: "article";
      item: PrintArticleItem;
      content: unknown;
      pageIndex: number;
      pageNumber: number;
    }
  | { kind: "map"; item: IssuePrintSpecialItem; map: PrintMap; pageNumber: number };

function buildPrintPages(items: IssuePrintItem[], maps: PrintMap[]) {
  const mapsById = new Map(maps.map((map) => [map.id, map]));
  let nextPage = 3;

  return items.flatMap<PrintPage>((item) => {
    if (item.kind === "special") {
      const map =
        item.type === "map" && item.resourceId ? mapsById.get(item.resourceId) : undefined;
      if (!map || map.items.length === 0) return [];

      const pages: PrintPage[] = [
        { kind: "map", item, map, pageNumber: nextPage },
        { kind: "map", item, map, pageNumber: nextPage + 1 },
      ];
      nextPage += pages.length;
      return pages;
    }

    const contents = printContentPages(item);
    const pages = contents.map((content, pageIndex) => ({
      item,
      content,
      pageIndex,
      kind: "article" as const,
      pageNumber: nextPage + pageIndex,
    }));
    nextPage += pages.length;
    return pages;
  });
}

export async function IssuePrintPreview({
  issue,
  articles,
  maps,
  issueNumber,
  embedded = false,
  resourceTitles = {},
}: IssuePrintPreviewProps) {
  const sequence = buildIssuePrintSequence(
    issue.homeBlocks,
    articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      titleStyled: article.titleStyled,
      excerpt: article.excerpt,
      authorName: article.authorName,
      categoryName: article.categoryName,
      contentRich: article.contentRich,
      imageUrl: article.imageUrl,
      imageAlt: article.imageAlt,
      imageSettings: article.imageSettings,
    })),
  );
  const printPages = buildPrintPages(sequence.items, maps);
  const firstPageByItemId = new Map<string, number>();
  for (const page of printPages) {
    const itemId = page.item.kind === "article" ? page.item.article.id : page.item.id;
    if (!firstPageByItemId.has(itemId)) firstPageByItemId.set(itemId, page.pageNumber);
  }
  const printIndexItems = sequence.items.flatMap((item) => {
    const itemId = item.kind === "article" ? item.article.id : item.id;
    const page = firstPageByItemId.get(itemId);
    return page ? [{ ...item, page }] : [];
  });
  const introItems = sequence.items.filter(
    (item) => item.kind === "article" && item.printSettings.showInIssueIntro,
  );
  const closingItem = sequence.items.find(
    (item) => item.kind === "article" && item.type === "closing",
  );
  const closingImagePath =
    closingItem?.kind === "article" && closingItem.article.imageUrl
      ? extractCmsMediaPathname(closingItem.article.imageUrl)
      : null;
  const closingImage =
    closingImagePath && closingItem?.kind === "article"
      ? {
          pathname: closingImagePath,
          alt: closingItem.article.imageAlt || closingItem.article.title,
        }
      : null;
  const qrCode = await QRCode.toDataURL("https://middleware.media", {
    width: 128,
    margin: 0,
    color: { dark: "#000000", light: "#f7f0e7" },
  });

  return (
    <div className={`print-v3-shell${embedded ? " print-v3-shell--embedded" : ""}`}>
      <div className="print-v3-actions print-preview-chrome">
        <PrintPreviewActions issueId={issue.id} />
      </div>
      <main className="print-v3-stage" aria-label="Anteprima del numero cartaceo">
        <div className="print-v3-page-group">
          <MagazineCover
            issue={issue}
            issueNumber={issueNumber}
            introItems={introItems}
            fallbackImage={closingImage}
            resourceTitles={resourceTitles}
            qrCode={qrCode}
          />
        </div>
        <div className="print-v3-page-group">
          <PrintIndex items={printIndexItems} resourceTitles={resourceTitles} />
        </div>
        {printPages.map((page, index) => {
          if (page.kind === "article") {
            return (
              <div
                className="print-v3-page-group print-v3-article-group"
                key={`${page.item.article.id}-${page.pageIndex}`}
              >
                <PrintArticle
                  item={page.item}
                  content={page.content}
                  continuation={page.pageIndex > 0}
                  pageNumber={page.pageNumber}
                />
              </div>
            );
          }

          const previousPage = printPages[index - 1];
          const isSecondMapPage =
            previousPage?.kind === "map" && previousPage.item.id === page.item.id;
          if (isSecondMapPage) return null;

          return (
            <div className="print-v3-page-group print-v3-map-group" key={page.item.id}>
              <PrintMapSpread
                map={page.map}
                openerPageNumber={page.pageNumber}
                directoryPageNumber={page.pageNumber + 1}
                qrCode={qrCode}
              />
            </div>
          );
        })}
      </main>
    </div>
  );
}
