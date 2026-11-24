import { PublicHomePage } from "@/components/public/pages/public-home-page";
import { getPublicHomeData } from "@/lib/public/server/home";
import { buildHomeMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { leadImage, leadImageAlt } = await getPublicHomeData();

  return buildHomeMetadata({
    openGraphImage: leadImage,
    openGraphImageAlt: leadImageAlt,
  });
}

export default async function Page() {
  const { currentIssue, publishedIssues } = await getPublicHomeData();

  return <PublicHomePage currentIssue={currentIssue} publishedIssues={publishedIssues} />;
}
