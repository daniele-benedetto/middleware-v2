import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getPublicIssueDescription,
  getPublicIssueLeadImage,
  getPublicPublishedIssues,
} from "@/lib/public/server/issues";
import { ensureNonEmptyStaticParams } from "@/lib/public/server/static-params";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

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

export async function getPublicIssuePageData(slug: string): Promise<PublicIssuePageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ISSUE_PAGE_CACHE_TAG);

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

export async function getPublicIssueStaticParams() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ISSUE_PAGE_CACHE_TAG);

  try {
    const issues = await getPublicPublishedIssues("public.getPublicIssueStaticParams");
    return ensureNonEmptyStaticParams(issues.map((issue) => ({ slug: issue.slug })));
  } catch (error) {
    console.error("public.getPublicIssueStaticParams published issues failed", { error });
    return ensureNonEmptyStaticParams([]);
  }
}
