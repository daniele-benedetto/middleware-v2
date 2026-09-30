import { IssuePrintPreview } from "@/components/cms/print/issue-print-preview";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssuePrintData } from "@/lib/cms/trpc/server-prefetch";
import { buildIssueNumberMap, formatIssueNumber } from "@/lib/public/format/issue";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";

import type { Metadata } from "next";

type PrintIssuePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embedded?: string }>;
};

export const metadata: Metadata = {
  title: "Preview numero cartaceo",
};

export default async function PrintIssuePage({ params, searchParams }: PrintIssuePageProps) {
  const { id: rawId } = await params;
  const { embedded } = await searchParams;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [{ issue, articles, resourceTitles }, publishedIssues] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchIssuePrintData(id)),
    getPublicPublishedIssues("cms.issuePrintPreview"),
  ]);
  const issueNumber =
    buildIssueNumberMap(publishedIssues).get(id) ?? formatIssueNumber(publishedIssues.length);

  return (
    <IssuePrintPreview
      issue={issue}
      articles={articles}
      issueNumber={issueNumber}
      resourceTitles={resourceTitles}
      embedded={embedded === "1"}
    />
  );
}
