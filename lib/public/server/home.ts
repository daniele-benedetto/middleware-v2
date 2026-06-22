import "server-only";

import { unstable_cache } from "next/cache";

import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

export const PUBLIC_HOME_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_HOME_CACHE_TAG = "public-home";

const PUBLIC_HOME_ISSUES_PAGE_SIZE = 100;

export type PublicHomeData = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  currentIssueDescription?: string;
  leadImage?: string;
};

function getCurrentIssueDescription(currentIssue: PublicCurrentIssueDetail | null) {
  if (!currentIssue) {
    return undefined;
  }

  if (typeof currentIssue.description === "string") {
    return currentIssue.description;
  }

  const description = extractPlainText(currentIssue.description);
  return description || undefined;
}

function getLeadImage(currentIssue: PublicCurrentIssueDetail | null) {
  return currentIssue?.articles.find((article) => article.imageUrl)?.imageUrl ?? undefined;
}

async function getCurrentIssue() {
  try {
    return (await publicIssuesService.getCurrent()) as PublicCurrentIssueDetail;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicHomeData current issue failed", error);
    return null;
  }
}

async function getPublishedIssueList() {
  try {
    return (await publicIssuesService.listPublishedItems({
      page: 1,
      pageSize: PUBLIC_HOME_ISSUES_PAGE_SIZE,
    })) as PublicIssueListItem[];
  } catch (error) {
    console.error("public.getPublicHomeData published issues failed", error);
    return [];
  }
}

async function loadPublicHomeData(): Promise<PublicHomeData> {
  const [currentIssue, publishedIssues] = await Promise.all([
    getCurrentIssue(),
    getPublishedIssueList(),
  ]);

  return {
    currentIssue,
    publishedIssues,
    currentIssueDescription: getCurrentIssueDescription(currentIssue),
    leadImage: getLeadImage(currentIssue),
  };
}

export const getPublicHomeData = unstable_cache(loadPublicHomeData, ["public-home-data"], {
  revalidate: PUBLIC_HOME_REVALIDATE_SECONDS,
  tags: [PUBLIC_HOME_CACHE_TAG],
});
