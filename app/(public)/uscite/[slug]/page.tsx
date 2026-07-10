import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicIssuePage as PublicIssuePageView } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicIssuePageData } from "@/lib/public/server/issue-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicIssuePageProps = {
  params: Promise<{ slug: string }>;
};

function getIssuePath(slug: string) {
  return `/uscite/${slug}`;
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
    socialImageSection: "magazine",
    socialImageTheme: "red",
  });
}

async function PublicIssueRouteContent({ params }: PublicIssuePageProps) {
  const { slug } = await params;
  const { issue, publishedIssues } = await getPublicIssuePageData(slug);

  if (!issue) {
    notFound();
  }

  return <PublicIssuePageView issue={issue} publishedIssues={publishedIssues} />;
}

export default function PublicIssueRoute({ params }: PublicIssuePageProps) {
  return (
    <Suspense fallback={null}>
      <PublicIssueRouteContent params={params} />
    </Suspense>
  );
}
