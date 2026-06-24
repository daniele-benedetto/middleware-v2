export type IssueNumberingArticle = {
  id: string;
  isFeatured: boolean;
  publishedAt: string;
};

export type IssueNumberingBlock<TArticle extends IssueNumberingArticle> = {
  type: "opening" | "body" | "rupture" | "closing";
  articles: TArticle[];
  featuredArticle: TArticle | null;
  featuredPlacement: "left" | "right";
};

export type NumberedIssueArticle<TArticle extends IssueNumberingArticle> = {
  article: TArticle;
  number: number;
};

export function sortIssueNumberingFallbackArticles<TArticle extends IssueNumberingArticle>(
  articles: TArticle[],
) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getIssueBlockNumberingArticles<TArticle extends IssueNumberingArticle>(
  block: IssueNumberingBlock<TArticle>,
) {
  if (block.type !== "body" || block.featuredPlacement !== "right" || !block.featuredArticle) {
    return block.articles;
  }

  return [
    ...block.articles.filter((article) => article.id !== block.featuredArticle?.id),
    block.featuredArticle,
  ];
}

export function getUnpaginatedIssueArticles<TArticle extends IssueNumberingArticle>(
  articles: TArticle[],
  blocks: IssueNumberingBlock<TArticle>[],
) {
  const blockArticleIds = new Set(
    blocks.flatMap((block) => block.articles.map((article) => article.id)),
  );
  return articles.filter((article) => !blockArticleIds.has(article.id));
}

export function assignIssueArticleNumbers<TArticle extends IssueNumberingArticle>(
  numbers: Map<string, number>,
  articles: TArticle[],
) {
  for (const article of articles) {
    if (!numbers.has(article.id)) {
      numbers.set(article.id, numbers.size + 1);
    }
  }
}

export function getIssueContentArticleNumbers<TArticle extends IssueNumberingArticle>(
  blocks: IssueNumberingBlock<TArticle>[],
) {
  const numbers = new Map<string, number>();

  assignIssueArticleNumbers(numbers, blocks.flatMap(getIssueBlockNumberingArticles));

  return numbers;
}

export function buildNumberedIssueArticles<TArticle extends IssueNumberingArticle>(
  articles: TArticle[],
  blocks: IssueNumberingBlock<TArticle>[],
): NumberedIssueArticle<TArticle>[] {
  if (blocks.length === 0) {
    return sortIssueNumberingFallbackArticles(articles).map((article, index) => ({
      article,
      number: index + 1,
    }));
  }

  const contentBlocks = blocks.filter((block) => block.type !== "closing");
  const closingBlocks = blocks.filter((block) => block.type === "closing");
  const numberedArticles: NumberedIssueArticle<TArticle>[] = [];
  const numberedIds = new Set<string>();
  const addArticles = (items: TArticle[]) => {
    for (const article of items) {
      if (numberedIds.has(article.id)) {
        continue;
      }

      numberedIds.add(article.id);
      numberedArticles.push({ article, number: numberedArticles.length + 1 });
    }
  };

  addArticles(contentBlocks.flatMap(getIssueBlockNumberingArticles));
  addArticles(sortIssueNumberingFallbackArticles(getUnpaginatedIssueArticles(articles, blocks)));
  addArticles(closingBlocks.flatMap((block) => block.articles));

  return numberedArticles;
}

export function getIssueArticleNumberMap<TArticle extends IssueNumberingArticle>(
  articles: TArticle[],
  blocks: IssueNumberingBlock<TArticle>[],
) {
  return new Map(
    buildNumberedIssueArticles(articles, blocks).map((item) => [item.article.id, item.number]),
  );
}
