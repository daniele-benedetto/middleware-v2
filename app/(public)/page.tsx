import { PublicHomePage } from "@/components/public/home";
import { getCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import { getPublishedIssues } from "@/lib/public/server/issues";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function getCurrentIssueDescription(
  currentIssue: Awaited<ReturnType<typeof getCurrentIssueDetail>>,
) {
  if (!currentIssue) {
    return undefined;
  }

  if (typeof currentIssue.description === "string") {
    return currentIssue.description;
  }

  const description = extractPlainText(currentIssue.description);
  return description || undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const currentIssue = await getCurrentIssueDetail();
  const leadImage = currentIssue?.articles.find((article) => article.imageUrl)?.imageUrl;

  return buildPageMetadata({
    title: currentIssue?.title,
    description: getCurrentIssueDescription(currentIssue),
    path: "/",
    openGraphImage: leadImage ?? undefined,
    twitterImage: leadImage ?? undefined,
  });
}

export default async function Page() {
  const [currentIssue, publishedIssues] = await Promise.all([
    getCurrentIssueDetail(),
    getPublishedIssues(),
  ]);

  return <PublicHomePage currentIssue={currentIssue} publishedIssues={publishedIssues} />;
}
