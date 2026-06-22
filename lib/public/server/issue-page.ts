import "server-only";

import { unstable_cache } from "next/cache";

import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

export const PUBLIC_ISSUE_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ISSUE_PAGE_CACHE_TAG = "public-issue";

const PUBLIC_ISSUE_PAGE_ISSUES_PAGE_SIZE = 100;

export type PublicIssuePageData = {
  issue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  issueDescription?: string;
  leadImage?: string;
  leadImageAlt?: string;
};

function getIssueDescription(issue: PublicCurrentIssueDetail | null) {
  if (!issue) return undefined;
  if (typeof issue.description === "string") return issue.description;

  const description = extractPlainText(issue.description);
  return description || undefined;
}

function getLeadImage(issue: PublicCurrentIssueDetail | null) {
  const article = issue?.articles.find((item) => item.imageUrl);

  return {
    url: article?.imageUrl ?? undefined,
    alt: article?.imageAlt ?? undefined,
  };
}

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

async function getPublishedIssueList() {
  try {
    return (await publicIssuesService.listPublishedItems({
      page: 1,
      pageSize: PUBLIC_ISSUE_PAGE_ISSUES_PAGE_SIZE,
    })) as PublicIssueListItem[];
  } catch (error) {
    console.error("public.getPublicIssuePageData published issues failed", error);
    return [];
  }
}

async function loadPublicIssuePageData(slug: string): Promise<PublicIssuePageData> {
  const [issue, publishedIssues] = await Promise.all([
    getIssueBySlug(slug),
    getPublishedIssueList(),
  ]);
  const leadImage = getLeadImage(issue);

  return {
    issue,
    publishedIssues,
    issueDescription: getIssueDescription(issue),
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
    const issues = await getPublishedIssueList();
    return issues.map((issue) => ({ slug: issue.slug }));
  },
  ["public-issue-static-params"],
  {
    revalidate: PUBLIC_ISSUE_PAGE_REVALIDATE_SECONDS,
    tags: [PUBLIC_ISSUE_PAGE_CACHE_TAG],
  },
);
