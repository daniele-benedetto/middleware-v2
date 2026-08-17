import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE,
  getPublicPublishedIssues,
} from "@/lib/public/server/issues";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

export const PUBLIC_ISSUES_ARCHIVE_CACHE_TAG = "public-issues-archive";
export const PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE = PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE;

export type PublicIssuesArchiveData = {
  issues: PublicIssueListItem[];
};

export async function getPublicIssuesArchiveData(): Promise<PublicIssuesArchiveData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ISSUES_ARCHIVE_CACHE_TAG);

  const issues = await getPublicPublishedIssues(
    "public.getPublicIssuesArchiveData",
    PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE,
  );

  return { issues };
}
