import { resolveIssueHomeBlocks } from "@/components/public/home/resolve-issue-home-blocks";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

export type HomeIssueArticle = PublicCurrentIssueDetail["articles"][number];

export type NarrativeHomeBlock = {
  id: string;
  type: "opening" | "body" | "rupture" | "closing";
  variant: "black" | "red" | "default";
  title: string | null;
  titleStyled: IssueTitleStyled | null;
  description: string | null;
  articles: HomeIssueArticle[];
  featuredArticle: HomeIssueArticle | null;
  featuredPlacement: "left" | "right";
};

export function sortHomeArticles(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
}

export function composeNarrativeHomeBlocks(
  issue: PublicCurrentIssueDetail | null,
): NarrativeHomeBlock[] {
  return resolveIssueHomeBlocks(issue);
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
  const oldestFirst = [...issues].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const index = oldestFirst.findIndex((issue) => issue.id === currentIssue.id);
  return formatter(index >= 0 ? index : 0);
}
