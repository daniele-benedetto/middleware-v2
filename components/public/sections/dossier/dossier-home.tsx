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

type DossierHomeProps = {
  issue: PublicCurrentIssueDetail;
};

function renderBlock(
  block: NarrativeHomeBlock,
  articleNumbers: Map<string, number>,
  options: { priority?: boolean } = {},
) {
  switch (block.type) {
    case "opening":
      return (
        <LeadBlock
          key={block.id}
          block={block}
          articleNumbers={articleNumbers}
          priority={options.priority}
        />
      );
    case "body":
      return <BodyBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "rupture":
      return <FeatureBreakBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "closing":
      return <ClosingBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    default: {
      const exhaustiveCheck: never = block.type;
      throw new Error(`Unhandled narrative block type: ${String(exhaustiveCheck)}`);
    }
  }
}

export function DossierHome({ issue }: DossierHomeProps) {
  const blocks = resolveIssueHomeBlocks(issue);

  if (blocks.length === 0) {
    return <UnpaginatedArticleRow articles={issue.articles} />;
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
        renderBlock(block, articleNumbers, { priority: index === 0 }),
      )}
      <UnpaginatedArticleRow articles={unpaginatedArticles} startNumber={unpaginatedStartNumber} />
      {closingBlocks.map((block) => renderBlock(block, articleNumbers))}
    </div>
  );
}
