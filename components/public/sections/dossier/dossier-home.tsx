import { resolveIssueHomeBlocks } from "@/components/public/home/resolve-issue-home-blocks";
import { BodyBlock } from "@/components/public/sections/dossier/body-block";
import { ClosingBlock } from "@/components/public/sections/dossier/closing-block";
import {
  getUnpaginatedArticles,
  sortUnpaginatedArticles,
} from "@/components/public/sections/dossier/dossier-view-model";
import { FeatureBreakBlock } from "@/components/public/sections/dossier/feature-break-block";
import { LeadBlock } from "@/components/public/sections/dossier/lead-block";
import { UnpaginatedArticleRow } from "@/components/public/sections/dossier/unpaginated-article-row";
import { CourseHomeBlock } from "@/components/public/sections/formazione/course-home-block";
import { MapHomeBlock } from "@/components/public/sections/maps/map-home-block";
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
  courseStartNumbers: Map<string, number>,
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
      return (
        <CourseHomeBlock
          key={block.id}
          block={block}
          startNumber={courseStartNumbers.get(block.id) ?? 1}
        />
      );
    case "map":
      return <MapHomeBlock key={block.id} block={block} />;
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
    (block): block is NarrativeHomeBlock => block.type !== "course" && block.type !== "map",
  );
  const unpaginatedArticles = getUnpaginatedArticles(issue, articleBlocks);
  const closingBlocks = articleBlocks.filter((block) => block.type === "closing");
  const articleNumbers = new Map<string, number>();
  const courseStartNumbers = new Map<string, number>();
  let nextNumber = 1;

  const addArticles = (articles: NarrativeHomeBlock["articles"]) => {
    for (const article of articles) {
      if (!articleNumbers.has(article.id)) {
        articleNumbers.set(article.id, nextNumber);
        nextNumber += 1;
      }
    }
  };

  for (const block of blocks.filter((block) => block.type !== "closing")) {
    if (block.type === "course") {
      courseStartNumbers.set(block.id, nextNumber);
      nextNumber += block.course.lessons.length;
    } else if (block.type !== "map") {
      addArticles(getIssueBlockNumberingArticles(block));
    }
  }

  const unpaginatedStartNumber = nextNumber;
  addArticles(sortUnpaginatedArticles(unpaginatedArticles));
  closingBlocks.forEach((block) => addArticles(block.articles));

  return (
    <div className="bg-background">
      {blocks
        .filter((block) => block.type !== "closing")
        .map((block, index) =>
          renderBlock(block, variant, articleNumbers, courseStartNumbers, {
            priority: index === 0,
          }),
        )}
      <UnpaginatedArticleRow articles={unpaginatedArticles} startNumber={unpaginatedStartNumber} />
      {closingBlocks.map((block) =>
        renderBlock(block, variant, articleNumbers, courseStartNumbers),
      )}
    </div>
  );
}
