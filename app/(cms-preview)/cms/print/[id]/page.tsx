import { IssuePrintDocument } from "@/components/cms/print/issue-print-document";
import { IssuePrintViewer } from "@/components/cms/print/issue-print-viewer";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssuePrintData } from "@/lib/cms/trpc/server-prefetch";
import { resolvePrintFormat } from "@/lib/print/format";
import { buildPrintIssueDocument } from "@/lib/print/issue-document";
import { inspectPrintIssueDocument } from "@/lib/print/preflight";
import { resolvePrintDarkTone } from "@/lib/print/theme";
import { buildIssueNumberMap, formatIssueNumber } from "@/lib/public/format/issue";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";
import { seoConfig } from "@/lib/seo/config";

import type { Metadata } from "next";

type PrintIssuePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ render?: string; format?: string }>;
};

export const metadata: Metadata = {
  title: "Preview numero cartaceo",
};

export default async function PrintIssuePage({ params, searchParams }: PrintIssuePageProps) {
  const { id: rawId } = await params;
  const { render, format: rawFormat } = await searchParams;
  const format = resolvePrintFormat(rawFormat);
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [{ issue, articles, maps, courses }, publishedIssues] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchIssuePrintData(id)),
    getPublicPublishedIssues("cms.issuePrintPreview"),
  ]);
  const issueNumber =
    buildIssueNumberMap(publishedIssues).get(id) ?? formatIssueNumber(publishedIssues.length);
  const document = buildPrintIssueDocument({
    issue,
    articles,
    maps,
    courses,
    issueNumber,
    format,
  });

  return (
    <IssuePrintViewer
      key={format}
      issueId={issue.id}
      format={format}
      variant={document.variant}
      tone={resolvePrintDarkTone(document.variant)}
      mode={render === "pdf" ? "pdf" : "preview"}
      preflight={inspectPrintIssueDocument(document)}
    >
      <IssuePrintDocument document={document} siteUrl={seoConfig.siteUrl} />
    </IssuePrintViewer>
  );
}
