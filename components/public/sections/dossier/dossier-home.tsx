import { resolveIssueHomeBlocks } from "@/components/public/home/resolve-issue-home-blocks";
import { BodyBlock } from "@/components/public/sections/dossier/body-block";
import { ClosingBlock } from "@/components/public/sections/dossier/closing-block";
import {
  assignArticleNumbers,
  getArticleNumbers,
  getUnpaginatedArticles,
  sortUnpaginatedArticles,
} from "@/components/public/sections/dossier/dossier-view-model";
import { FeatureBreakBlock } from "@/components/public/sections/dossier/feature-break-block";
import { LeadBlock } from "@/components/public/sections/dossier/lead-block";
import { UnpaginatedArticleRow } from "@/components/public/sections/dossier/unpaginated-article-row";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";
import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CSSProperties } from "react";

type DossierHomeProps = {
  issue: PublicCurrentIssueDetail;
};

function renderBlock(
  block: NarrativeHomeBlock,
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
    default: {
      const exhaustiveCheck: never = block.type;
      throw new Error(`Unhandled narrative block type: ${String(exhaustiveCheck)}`);
    }
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

  const unpaginatedArticles = getUnpaginatedArticles(issue, blocks);
  const contentBlocks = blocks.filter((block) => block.type !== "closing");
  const closingBlocks = blocks.filter((block) => block.type === "closing");
  const articleNumbers = getArticleNumbers(contentBlocks);
  const unpaginatedStartNumber = articleNumbers.size + 1;

  assignArticleNumbers(articleNumbers, sortUnpaginatedArticles(unpaginatedArticles));
  assignArticleNumbers(
    articleNumbers,
    closingBlocks.flatMap((block) => block.articles),
  );

  return (
    <div className="bg-background">
      {contentBlocks.map((block, index) =>
        renderBlock(block, variant, articleNumbers, { priority: index === 0 }),
      )}
      <UnpaginatedArticleRow articles={unpaginatedArticles} startNumber={unpaginatedStartNumber} />
      {closingBlocks.map((block) => renderBlock(block, variant, articleNumbers))}
    </div>
  );
}
