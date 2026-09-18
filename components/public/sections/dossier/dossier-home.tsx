import { IssueTableOfContents } from "@/components/public/home/issue-table-of-contents";
import { IssueTableOfContentsMenu } from "@/components/public/home/issue-table-of-contents-menu";
import { resolveIssueHomeBlocks } from "@/components/public/home/resolve-issue-home-blocks";
import { BodyBlock } from "@/components/public/sections/dossier/body-block";
import { ClosingBlock } from "@/components/public/sections/dossier/closing-block";
import { DossierContentReveal } from "@/components/public/sections/dossier/dossier-content-reveal";
import {
  getUnpaginatedArticles,
  sortUnpaginatedArticles,
} from "@/components/public/sections/dossier/dossier-view-model";
import { FeatureBreakBlock } from "@/components/public/sections/dossier/feature-break-block";
import { LeadBlock } from "@/components/public/sections/dossier/lead-block";
import { PreviewHomeBlock } from "@/components/public/sections/dossier/preview-home-block";
import { UnpaginatedArticleRow } from "@/components/public/sections/dossier/unpaginated-article-row";
import { CourseHomeBlock } from "@/components/public/sections/formazione/course-home-block";
import { MapHomeBlock } from "@/components/public/sections/maps/map-home-block";
import { QuestionnaireAnalysisHomeBlock } from "@/components/public/sections/questionnaires/questionnaire-analysis-home-block";
import { buildIssueNumberMap, formatIssueNumber } from "@/lib/public/format/issue";
import { getIssueBlockNumberingArticles } from "@/lib/public/issue-numbering";

import type {
  HomeIssueArticle,
  NarrativeHomeBlock,
  ResolvedHomeBlock,
} from "@/components/public/home/home-view-model";
import type {
  IssueTableOfContentsIssue,
  IssueTableOfContentsItem,
} from "@/components/public/home/issue-table-of-contents";
import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { ReactNode } from "react";

type DossierHomeProps = {
  hero?: ReactNode;
  issue: PublicCurrentIssueDetail;
  publishedIssues: PublicIssueListItem[];
};

function getBlockAnchorId(block: ResolvedHomeBlock) {
  return `issue-block-${block.id}`;
}

function getArticleIndexItem(
  article: HomeIssueArticle,
  articleNumbers: Map<string, number>,
): IssueTableOfContentsItem {
  return {
    id: `issue-article-${article.id}`,
    label: article.title,
    number: articleNumbers.get(article.id),
  };
}

function getBlockIndexItems(
  block: ResolvedHomeBlock,
  articleNumbers: Map<string, number>,
): IssueTableOfContentsItem[] {
  switch (block.type) {
    case "opening":
    case "body":
    case "rupture":
    case "closing":
      return getIssueBlockNumberingArticles(block).map((article) =>
        getArticleIndexItem(article, articleNumbers),
      );
    case "course":
      return [{ id: getBlockAnchorId(block), label: block.course.title, icon: "course" }];
    case "map":
      return [{ id: getBlockAnchorId(block), label: block.map.title, icon: "map" }];
    case "questionnaireAnalysis":
      return [
        {
          id: getBlockAnchorId(block),
          label: block.questionnaireAnalysis.title,
          icon: "questionnaireAnalysis",
        },
      ];
    case "preview":
      return [
        {
          id: getBlockAnchorId(block),
          label: block.previewIssue.article.title,
          icon: "preview",
        },
      ];
  }
}

function renderBlock(
  block: ResolvedHomeBlock,
  variant: IssueHomeVariant,
  articleNumbers: Map<string, number>,
  options: { priority?: boolean; previewIssueNumber?: string } = {},
) {
  switch (block.type) {
    case "opening":
      return (
        <LeadBlock
          key={block.id}
          block={block}
          variant={variant}
          articleNumbers={articleNumbers}
          priority={options.priority}
        />
      );
    case "body":
      return (
        <BodyBlock
          key={block.id}
          block={block}
          articleNumbers={articleNumbers}
          priority={options.priority}
        />
      );
    case "rupture":
      return (
        <FeatureBreakBlock
          key={block.id}
          block={block}
          variant={variant}
          articleNumbers={articleNumbers}
          priority={options.priority}
        />
      );
    case "closing":
      return (
        <ClosingBlock
          key={block.id}
          block={block}
          variant={variant}
          articleNumbers={articleNumbers}
        />
      );
    case "course":
      return <CourseHomeBlock key={block.id} block={block} startNumber={1} />;
    case "map":
      return <MapHomeBlock key={block.id} block={block} />;
    case "questionnaireAnalysis":
      return <QuestionnaireAnalysisHomeBlock key={block.id} block={block} />;
    case "preview":
      return (
        <PreviewHomeBlock
          key={block.id}
          block={block}
          issueNumber={options.previewIssueNumber}
          priority={options.priority}
        />
      );
  }
}

export function DossierHome({ hero, issue, publishedIssues }: DossierHomeProps) {
  const blocks = resolveIssueHomeBlocks(issue);
  const variant = issue.homeVariant;
  const issueNumbers = buildIssueNumberMap(publishedIssues);
  const nextIssueNumber = formatIssueNumber(publishedIssues.length);
  const currentIssueNumber = issueNumbers.get(issue.id) ?? nextIssueNumber;
  const issueOptions: IssueTableOfContentsIssue[] = publishedIssues
    .toSorted((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map((publishedIssue) => ({
      id: publishedIssue.id,
      issueNumber: issueNumbers.get(publishedIssue.id) ?? nextIssueNumber,
      slug: publishedIssue.slug,
      title: publishedIssue.title,
    }));

  if (blocks.length === 0) {
    const articles = sortUnpaginatedArticles(issue.articles);
    const articleNumbers = new Map(articles.map((article, index) => [article.id, index + 1]));

    return (
      <>
        <IssueTableOfContentsMenu
          items={articles.map((article) => getArticleIndexItem(article, articleNumbers))}
          issueNumber={currentIssueNumber}
          issueTitle={issue.title}
          issues={issueOptions}
        />
        {hero}
        <DossierContentReveal>
          <div>
            <IssueTableOfContents
              items={articles.map((article) => getArticleIndexItem(article, articleNumbers))}
              issueNumber={currentIssueNumber}
              issueTitle={issue.title}
              issues={issueOptions}
              showMenu={false}
            />
            <div
              id="issue-unpaginated-articles"
              className="scroll-mt-[var(--public-issue-anchor-offset)]"
            >
              <UnpaginatedArticleRow articles={issue.articles} />
            </div>
          </div>
        </DossierContentReveal>
      </>
    );
  }

  const articleBlocks = blocks.filter(
    (block): block is NarrativeHomeBlock =>
      block.type !== "course" &&
      block.type !== "map" &&
      block.type !== "questionnaireAnalysis" &&
      block.type !== "preview",
  );
  const unpaginatedArticles = getUnpaginatedArticles(issue, articleBlocks);
  const closingBlocks = articleBlocks.filter((block) => block.type === "closing");
  const firstClosingIndex = blocks.findIndex((block) => block.type === "closing");
  const leadingBlocks = firstClosingIndex === -1 ? blocks : blocks.slice(0, firstClosingIndex);
  const trailingBlocks = firstClosingIndex === -1 ? [] : blocks.slice(firstClosingIndex);
  const articleNumbers = new Map<string, number>();
  let nextNumber = 1;

  const addArticles = (articles: NarrativeHomeBlock["articles"]) => {
    for (const article of articles) {
      if (!articleNumbers.has(article.id)) {
        articleNumbers.set(article.id, nextNumber);
        nextNumber += 1;
      }
    }
  };

  for (const block of leadingBlocks) {
    if (
      block.type !== "map" &&
      block.type !== "course" &&
      block.type !== "questionnaireAnalysis" &&
      block.type !== "preview"
    ) {
      addArticles(getIssueBlockNumberingArticles(block));
    }
  }

  const unpaginatedStartNumber = nextNumber;
  addArticles(sortUnpaginatedArticles(unpaginatedArticles));
  closingBlocks.forEach((block) => addArticles(block.articles));
  const tableOfContentsItems = [
    ...leadingBlocks.flatMap((block) => getBlockIndexItems(block, articleNumbers)),
    ...(unpaginatedArticles.length > 0
      ? sortUnpaginatedArticles(unpaginatedArticles).map((article) =>
          getArticleIndexItem(article, articleNumbers),
        )
      : []),
    ...trailingBlocks.flatMap((block) => getBlockIndexItems(block, articleNumbers)),
  ];

  return (
    <div className="bg-background">
      <IssueTableOfContentsMenu
        items={tableOfContentsItems}
        issueNumber={currentIssueNumber}
        issueTitle={issue.title}
        issues={issueOptions}
      />
      {hero}
      <DossierContentReveal>
        <div>
          <IssueTableOfContents
            items={tableOfContentsItems}
            issueNumber={currentIssueNumber}
            issueTitle={issue.title}
            issues={issueOptions}
            showMenu={false}
          />
          {leadingBlocks.map((block, index) => (
            <div
              id={getBlockAnchorId(block)}
              className="scroll-mt-[var(--public-issue-anchor-offset)]"
              key={block.id}
            >
              {renderBlock(block, variant, articleNumbers, {
                priority: index === 0,
                previewIssueNumber:
                  block.type === "preview"
                    ? (issueNumbers.get(block.previewIssue.id) ?? nextIssueNumber)
                    : undefined,
              })}
            </div>
          ))}
          {unpaginatedArticles.length > 0 ? (
            <div
              id="issue-unpaginated-articles"
              className="scroll-mt-[var(--public-issue-anchor-offset)]"
            >
              <UnpaginatedArticleRow
                articles={unpaginatedArticles}
                startNumber={unpaginatedStartNumber}
              />
            </div>
          ) : null}
          {trailingBlocks.map((block) => (
            <div
              id={getBlockAnchorId(block)}
              className="scroll-mt-[var(--public-issue-anchor-offset)]"
              key={block.id}
            >
              {renderBlock(block, variant, articleNumbers, {
                previewIssueNumber:
                  block.type === "preview"
                    ? (issueNumbers.get(block.previewIssue.id) ?? nextIssueNumber)
                    : undefined,
              })}
            </div>
          ))}
        </div>
      </DossierContentReveal>
    </div>
  );
}
