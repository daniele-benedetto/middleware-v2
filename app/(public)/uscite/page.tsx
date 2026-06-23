import { PublicIssuesArchivePage } from "@/components/public/pages";
import { getPublicIssuesArchiveData } from "@/lib/public/server/issues-archive";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 3600;

const archivePath = "/uscite";
const archiveTitle = "Archivio Magazine";
const archiveDescription =
  "Tutti i numeri pubblicati da Middleware, organizzati come uscite editoriali e dossier completi.";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: archiveTitle,
    description: archiveDescription,
    path: archivePath,
  });
}

export default async function PublicIssuesArchiveRoute() {
  const { issues } = await getPublicIssuesArchiveData();

  return <PublicIssuesArchivePage issues={issues} />;
}
