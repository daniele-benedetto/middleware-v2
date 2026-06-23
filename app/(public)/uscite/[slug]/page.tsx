import { notFound } from "next/navigation";

import { PublicIssuePage as PublicIssuePageView } from "@/components/public/pages";
import { getPublicIssuePageData, getPublicIssueStaticParams } from "@/lib/public/server/issue-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 3600;

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
      title: "Uscita non trovata",
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

  return <PublicIssuePageView issue={issue} publishedIssues={publishedIssues} />;
}
