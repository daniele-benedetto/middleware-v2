"use cache";

import { PublicIssuesArchivePage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicIssuesArchiveData } from "@/lib/public/server/issues-archive";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

const archivePath = "/uscite";

export async function generateMetadata(): Promise<Metadata> {
  const text = i18n.public.issuesArchive.metadata;

  return buildPageMetadata({
    title: text.title,
    description: text.description,
    path: archivePath,
  });
}

export default async function PublicIssuesArchiveRoute() {
  const { issues } = await getPublicIssuesArchiveData();

  return <PublicIssuesArchivePage issues={issues} />;
}
