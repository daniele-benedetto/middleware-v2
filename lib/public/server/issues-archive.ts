import "server-only";

import { unstable_cache } from "next/cache";

import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

export const PUBLIC_ISSUES_ARCHIVE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ISSUES_ARCHIVE_CACHE_TAG = "public-issues-archive";

const PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE = 100;

export type PublicIssuesArchiveData = {
  issues: PublicIssueListItem[];
};

async function loadPublicIssuesArchiveData(): Promise<PublicIssuesArchiveData> {
  try {
    const issues = (await publicIssuesService.listPublishedItems({
      page: 1,
      pageSize: PUBLIC_ISSUES_ARCHIVE_PAGE_SIZE,
    })) as PublicIssueListItem[];

    return { issues };
  } catch (error) {
    console.error("public.getPublicIssuesArchiveData published issues failed", error);
    return { issues: [] };
  }
}

export const getPublicIssuesArchiveData = unstable_cache(
  loadPublicIssuesArchiveData,
  ["public-issues-archive-data-v2"],
  {
    revalidate: PUBLIC_ISSUES_ARCHIVE_REVALIDATE_SECONDS,
    tags: [PUBLIC_ISSUES_ARCHIVE_CACHE_TAG],
  },
);
