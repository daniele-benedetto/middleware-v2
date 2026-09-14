import { resolveIssueHomeBlocks } from "@/components/public/home/resolve-issue-home-blocks";
import { BodyBlock } from "@/components/public/sections/dossier/body-block";
import { ClosingBlock } from "@/components/public/sections/dossier/closing-block";
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
import { getIssueBlockNumberingArticles } from "@/lib/public/issue-numbering";

import type {
  NarrativeHomeBlock,
  ResolvedHomeBlock,
} from "@/components/public/home/home-view-model";
import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CSSProperties } from "react";

type DossierHomeProps = {
  issue: PublicCurrentIssueDetail;
};

function renderBlock(
  block: ResolvedHomeBlock,
  variant: IssueHomeVariant,
  articleNumbers: Map<string, number>,
  options: { priority?: boolean } = {},
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
      return <PreviewHomeBlock key={block.id} block={block} priority={options.priority} />;
  }
}

export function DossierHome({ issue }: DossierHomeProps) {
  const blocks = resolveIssueHomeBlocks(issue);
  const variant = issue.homeVariant;

  if (blocks.length === 0) {
    return (
      <div data-page-reveal="body" style={{ "--page-reveal-delay": "660ms" } as CSSProperties}>
        <UnpaginatedArticleRow articles={issue.articles} />
      </div>
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

  return (
    <div className="bg-background">
      {leadingBlocks.map((block, index) =>
        renderBlock(block, variant, articleNumbers, {
          priority: index === 0,
        }),
      )}
      <UnpaginatedArticleRow articles={unpaginatedArticles} startNumber={unpaginatedStartNumber} />
      {trailingBlocks.map((block) => renderBlock(block, variant, articleNumbers))}
    </div>
  );
}
