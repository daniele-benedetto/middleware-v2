import "server-only";

import { unstable_cache } from "next/cache";

import {
  getPublicIssueDescription,
  getPublicIssueLeadImage,
  getPublicPublishedIssues,
} from "@/lib/public/server/issues";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

export const PUBLIC_HOME_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_HOME_CACHE_TAG = "public-home";

export type PublicHomeData = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  currentIssueDescription?: string;
  leadImage?: string;
  leadImageAlt?: string;
};

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

async function loadPublicHomeData(): Promise<PublicHomeData> {
  const [currentIssue, publishedIssues] = await Promise.all([
    getCurrentIssue(),
    getPublicPublishedIssues("public.getPublicHomeData"),
  ]);
  const leadImage = getPublicIssueLeadImage(currentIssue);

  return {
    currentIssue,
    publishedIssues,
    currentIssueDescription: getPublicIssueDescription(currentIssue),
    leadImage: leadImage.url,
    leadImageAlt: leadImage.alt,
  };
}

export const getPublicHomeData = unstable_cache(loadPublicHomeData, ["public-home-data"], {
  revalidate: PUBLIC_HOME_REVALIDATE_SECONDS,
  tags: [PUBLIC_HOME_CACHE_TAG],
});
