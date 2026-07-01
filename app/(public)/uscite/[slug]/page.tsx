import { notFound } from "next/navigation";

import { PublicIssuePage as PublicIssuePageView } from "@/components/public/pages";
import { PublicObservabilityTracker } from "@/components/telemetry/public-observability-tracker";
import { i18n } from "@/lib/i18n";
import { getPublicIssuePageData, getPublicIssueStaticParams } from "@/lib/public/server/issue-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicIssuePageProps = {
  params: Promise<{ slug: string }>;
};

function getIssuePath(slug: string) {
  return `/uscite/${slug}`;
}

export async function generateStaticParams() {
  return getPublicIssueStaticParams();
}

export async function generateMetadata({ params }: PublicIssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { issue, issueDescription, leadImage, leadImageAlt } = await getPublicIssuePageData(slug);

  if (!issue) {
    return buildPageMetadata({
      title: i18n.public.metadata.issueNotFound,
      path: getIssuePath(slug),
      index: false,
    });
  }

  return buildPageMetadata({
    title: issue.title,
    description: issueDescription,
    path: getIssuePath(issue.slug),
    openGraphImage: leadImage,
    openGraphImageAlt: leadImageAlt,
    twitterImage: leadImage,
  });
}

export default async function PublicIssueRoute({ params }: PublicIssuePageProps) {
  const { slug } = await params;
  const { issue, publishedIssues } = await getPublicIssuePageData(slug);

  if (!issue) {
    notFound();
  }

  return (
    <>
      <PublicObservabilityTracker
        pageType="issue"
        contentType="issue"
        contentId={issue.id}
        slug={issue.slug}
        path={getIssuePath(issue.slug)}
      />
      <PublicIssuePageView issue={issue} publishedIssues={publishedIssues} />
    </>
  );
}
