import "server-only";

import { extractPlainText } from "@/lib/rich-text/plain-text";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

export const PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE = 100;

export function getPublicIssueDescription(issue: PublicCurrentIssueDetail | null) {
  if (!issue) {
    return undefined;
  }

  if (typeof issue.description === "string") {
    return issue.description;
  }

  const description = extractPlainText(issue.description);
  return description || undefined;
}

export function getPublicIssueLeadImage(issue: PublicCurrentIssueDetail | null) {
  const article = issue?.articles.find((item) => item.imageUrl);

  return {
    url: article?.imageUrl ?? undefined,
    alt: article?.imageAlt ?? undefined,
  };
}

export async function getPublicPublishedIssues(
  context: string,
  pageSize = PUBLIC_PUBLISHED_ISSUES_PAGE_SIZE,
) {
  try {
    return (await publicIssuesService.listPublishedItems({
      page: 1,
      pageSize,
    })) as PublicIssueListItem[];
  } catch (error) {
    console.error(`${context} published issues failed`, error);
    return [];
  }
}
