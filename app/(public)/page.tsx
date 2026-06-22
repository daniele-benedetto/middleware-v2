import { PublicHomePage } from "@/components/public/home";
import { getPublicHomeData } from "@/lib/public/server/home";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { currentIssue, currentIssueDescription, leadImage } = await getPublicHomeData();

  return buildPageMetadata({
    title: currentIssue?.title,
    description: currentIssueDescription,
    path: "/",
    openGraphImage: leadImage,
    twitterImage: leadImage,
  });
}

export default async function Page() {
  const { currentIssue, publishedIssues } = await getPublicHomeData();

  return <PublicHomePage currentIssue={currentIssue} publishedIssues={publishedIssues} />;
}
