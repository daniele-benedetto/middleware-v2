import QRCode from "qrcode";

import { PrintArticle } from "@/components/cms/print/print-article";
import { PrintCourse } from "@/components/cms/print/print-course";
import { PrintCover } from "@/components/cms/print/print-cover";
import { PrintMap } from "@/components/cms/print/print-map";
import { PrintToc } from "@/components/cms/print/print-toc";
import { withPrintCampaign, type PrintQrPlacement } from "@/lib/print/campaign";

import type { PrintIssueDocument, PrintSection } from "@/lib/print/issue-document";

function createQrCode(url: URL) {
  return QRCode.toDataURL(url.toString(), {
    width: 256,
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

function sectionQrTarget(
  section: PrintSection,
): { path: string; placement: PrintQrPlacement } | null {
  switch (section.kind) {
    case "map":
      return { path: section.sitePath, placement: "mappa" };
    case "course":
      return { path: section.sitePath, placement: "contro_formazione" };
    case "article":
      return section.stopWithSiteCta ? { path: section.articlePath, placement: "articolo" } : null;
  }
}

/** Semantic print source: Vivliostyle paginates this markup with `public/print/issue.css`. */
export async function IssuePrintDocument({
  document,
  siteUrl,
}: {
  document: PrintIssueDocument;
  siteUrl: URL;
}) {
  const siteLabel = siteUrl.host;
  const track = (path: string, placement: PrintQrPlacement) =>
    withPrintCampaign(new URL(path, siteUrl), { campaign: document.campaign, placement });
  const sectionQrCodes = await Promise.all(
    document.sections.map((section) => {
      const target = sectionQrTarget(section);
      return target ? createQrCode(track(target.path, target.placement)) : null;
    }),
  );

  return (
    <>
      <PrintCover cover={document.cover} />
      <PrintToc sections={document.sections} />
      {document.sections.map((section, index) => {
        const qrCode = sectionQrCodes[index] ?? null;

        switch (section.kind) {
          case "map":
            return (
              <PrintMap key={section.anchor} map={section} qrCode={qrCode} siteLabel={siteLabel} />
            );
          case "course":
            return (
              <PrintCourse
                key={section.anchor}
                course={section}
                qrCode={qrCode}
                siteLabel={siteLabel}
              />
            );
          case "article":
            return (
              <PrintArticle
                key={section.anchor}
                article={section}
                qrCode={qrCode}
                siteLabel={siteLabel}
              />
            );
        }
      })}
    </>
  );
}
