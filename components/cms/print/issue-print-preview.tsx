import {
  BarChart3,
  FileText,
  GraduationCap,
  Map,
  MessageCircle,
  Pencil,
  Search,
  Mic,
} from "lucide-react";
import QRCode from "qrcode";

import { MagazineCover } from "@/components/cms/print/magazine-cover";
import { PrintPreviewActions } from "@/components/cms/print/print-preview-actions";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { buildIssuePrintSequence, type IssuePrintItem } from "@/lib/print/issue-view-model";

import type { IssueDetail } from "@/features/cms/issues/hooks/use-issue-crud";
import type { RouterOutputs } from "@/lib/trpc/types";

type Article = RouterOutputs["articles"]["getById"];

type IssuePrintPreviewProps = {
  issue: IssueDetail;
  articles: Article[];
  issueNumber: string;
  embedded?: boolean;
  resourceTitles?: Record<string, string>;
};

function IndexIcon({ type }: { type: string }) {
  const Icon =
    type === "opening" || type === "closing"
      ? Pencil
      : type === "body"
        ? MessageCircle
        : type === "rupture"
          ? Search
          : type === "map"
            ? Map
            : type === "questionnaireAnalysis"
              ? BarChart3
              : type === "course"
                ? GraduationCap
                : type === "preview"
                  ? FileText
                  : Mic;

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

function PrintPageLabel({ number, children }: { number: string; children: string }) {
  return (
    <div className="print-v3-page-label">
      <span>{number}</span>
      <span>{children}</span>
    </div>
  );
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
                <IndexIcon type={item.type} />
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

export async function IssuePrintPreview({
  issue,
  articles,
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
      excerpt: article.excerpt,
      authorName: article.authorName,
      categoryName: article.categoryName,
      contentRich: article.contentRich,
      imageUrl: article.imageUrl,
      imageAlt: article.imageAlt,
      imageSettings: article.imageSettings,
    })),
  );
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
        <PrintPreviewActions />
      </div>

      <main className="print-v3-stage" aria-label="Anteprima del numero cartaceo">
        <div className="print-v3-page-group">
          <PrintPageLabel number="01">Copertina · A4 verticale</PrintPageLabel>
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
          <PrintPageLabel number="02">Indice · pagina sinistra</PrintPageLabel>
          <PrintIndex items={sequence.items} resourceTitles={resourceTitles} />
        </div>
      </main>
    </div>
  );
}
