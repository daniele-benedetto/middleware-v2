import { getIssueOrderIndex } from "@/lib/public/format/issue";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

export type HomeIssueArticle = PublicCurrentIssueDetail["articles"][number];

export type NarrativeHomeBlock = {
  id: string;
  type: "opening" | "body" | "rupture" | "closing";
  title: string | null;
  titleStyled: IssueTitleStyled | null;
  description: string | null;
  articles: HomeIssueArticle[];
  featuredArticle: HomeIssueArticle | null;
  featuredPlacement: "left" | "right";
};

export function sortHomeArticles(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
}

export function getIssuePlainDescription(issue: PublicCurrentIssueDetail | PublicIssueListItem) {
  if (typeof issue.description === "string") {
    return issue.description;
  }

  return extractPlainText(issue.description);
}

export function getArchiveIssues(
  issues: PublicIssueListItem[],
  currentIssue: PublicCurrentIssueDetail | null,
) {
  return issues.filter((issue) => issue.id !== currentIssue?.id);
}

export function getIssueOrderLabel(
  issues: PublicIssueListItem[],
  currentIssue: PublicCurrentIssueDetail,
  formatter: (order: number) => string,
) {
  return formatter(getIssueOrderIndex(issues, currentIssue.id));
}
