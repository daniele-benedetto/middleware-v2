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

export const PUBLIC_ISSUE_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ISSUE_PAGE_CACHE_TAG = "public-issue";

export type PublicIssuePageData = {
  issue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  issueDescription?: string;
  leadImage?: string;
  leadImageAlt?: string;
};

async function getIssueBySlug(slug: string) {
  try {
    return (await publicIssuesService.getBySlug(slug)) as PublicCurrentIssueDetail;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicIssuePageData issue failed", { slug, error });
    return null;
  }
}

async function loadPublicIssuePageData(slug: string): Promise<PublicIssuePageData> {
  const [issue, publishedIssues] = await Promise.all([
    getIssueBySlug(slug),
    getPublicPublishedIssues("public.getPublicIssuePageData"),
  ]);
  const leadImage = getPublicIssueLeadImage(issue);

  return {
    issue,
    publishedIssues,
    issueDescription: getPublicIssueDescription(issue),
    leadImage: leadImage.url,
    leadImageAlt: leadImage.alt,
  };
}

export const getPublicIssuePageData = unstable_cache(
  loadPublicIssuePageData,
  ["public-issue-page-data"],
  {
    revalidate: PUBLIC_ISSUE_PAGE_REVALIDATE_SECONDS,
    tags: [PUBLIC_ISSUE_PAGE_CACHE_TAG],
  },
);

export const getPublicIssueStaticParams = unstable_cache(
  async () => {
    const issues = await getPublicPublishedIssues("public.getPublicIssueStaticParams");
    return issues.map((issue) => ({ slug: issue.slug }));
  },
  ["public-issue-static-params"],
  {
    revalidate: PUBLIC_ISSUE_PAGE_REVALIDATE_SECONDS,
    tags: [PUBLIC_ISSUE_PAGE_CACHE_TAG],
  },
);
