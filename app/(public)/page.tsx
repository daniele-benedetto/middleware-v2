import { connection } from "next/server";

import { PublicHomePage } from "@/components/public/pages";
import { getPublicHomeData } from "@/lib/public/server/home";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { currentIssue, currentIssueDescription, leadImage, leadImageAlt } =
    await getPublicHomeData();

  return buildPageMetadata({
    title: currentIssue?.title,
    description: currentIssueDescription,
    path: "/",
    openGraphImage: leadImage,
    openGraphImageAlt: leadImageAlt,
    twitterImage: leadImage,
  });
}

export default async function Page() {
  await connection();
  const { currentIssue, publishedIssues } = await getPublicHomeData();

  return <PublicHomePage currentIssue={currentIssue} publishedIssues={publishedIssues} />;
}
