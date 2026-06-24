import "server-only";

import { unstable_cache } from "next/cache";

import {
  PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE,
  getPublicPublishedIssues,
} from "@/lib/public/server/issues";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

export const PUBLIC_ISSUES_ARCHIVE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ISSUES_ARCHIVE_CACHE_TAG = "public-issues-archive";
export const PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE = PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE;

export type PublicIssuesArchiveData = {
  issues: PublicIssueListItem[];
};

async function loadPublicIssuesArchiveData(): Promise<PublicIssuesArchiveData> {
  const issues = await getPublicPublishedIssues(
    "public.getPublicIssuesArchiveData",
    PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE,
  );

  return { issues };
}

export const getPublicIssuesArchiveData = unstable_cache(
  loadPublicIssuesArchiveData,
  ["public-issues-archive-data-v2"],
  {
    revalidate: PUBLIC_ISSUES_ARCHIVE_REVALIDATE_SECONDS,
    tags: [PUBLIC_ISSUES_ARCHIVE_CACHE_TAG],
  },
);
