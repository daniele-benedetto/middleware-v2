import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getPublicIssueDescription,
  getPublicIssueLeadImage,
  getPublicPublishedIssues,
} from "@/lib/public/server/issues";
import { getPublicQuestionnaireAnalysisCacheTag } from "@/lib/public/server/questionnaire-page";
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
    throw error;
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
  for (const block of issue?.homeBlocks ?? []) {
    if (block.type === "questionnaireAnalysis" && block.questionnaireId) {
      cacheTag(getPublicQuestionnaireAnalysisCacheTag(block.questionnaireId));
    }
  }
  const leadImage = getPublicIssueLeadImage(issue);

  return {
    issue,
    publishedIssues,
    issueDescription: getPublicIssueDescription(issue),
    leadImage: leadImage.url,
    leadImageAlt: leadImage.alt,
  };
}
