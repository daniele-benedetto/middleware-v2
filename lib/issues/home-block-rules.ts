import type { IssueHomeBlock } from "@/lib/server/modules/issues/schema";

type IssueHomeBlockInput = Omit<IssueHomeBlock, "source"> & {
  source?: IssueHomeBlock["source"];
};

export function isSingleArticleBlock(type: IssueHomeBlock["type"]) {
  return type === "opening" || type === "rupture" || type === "closing";
}

export function isEditorialSingleBlock(type: IssueHomeBlock["type"]) {
  return type === "opening" || type === "rupture";
}

export function normalizeHomeBlock(block: IssueHomeBlockInput): IssueHomeBlock {
  if (block.source === "remainder") {
    return {
      ...block,
      source: "remainder",
      articleIds: [],
      featuredArticleId: null,
      title: isEditorialSingleBlock(block.type) ? null : block.title,
      description: isEditorialSingleBlock(block.type) ? null : block.description,
    };
  }

  const articleIds = isSingleArticleBlock(block.type)
    ? block.articleIds.slice(0, 1)
    : block.articleIds;
  const featuredArticleId =
    block.featuredArticleId && articleIds.includes(block.featuredArticleId)
      ? block.featuredArticleId
      : (articleIds[0] ?? null);

  return {
    ...block,
    source: "manual",
    title: isEditorialSingleBlock(block.type) ? null : block.title,
    description: isEditorialSingleBlock(block.type) ? null : block.description,
    articleIds,
    featuredArticleId,
  };
}

export function createHomeBlock(
  input: Omit<IssueHomeBlock, "featuredArticleId" | "source"> & {
    featuredArticleId?: string | null;
    source?: IssueHomeBlock["source"];
  },
) {
  return normalizeHomeBlock({
    ...input,
    source: input.source ?? "manual",
    featuredArticleId: input.featuredArticleId ?? input.articleIds[0] ?? null,
  });
}

export function createEmptyHomeBlock(
  type: IssueHomeBlock["type"] = "constellation",
  id = `${type}-${Date.now().toString(36)}`,
) {
  return createHomeBlock({
    id,
    type,
    source: "manual",
    title: null,
    description: null,
    articleIds: [],
    featuredArticleId: null,
  });
}

export function reorderItems<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);

  if (item === undefined) {
    return items;
  }

  next.splice(to, 0, item);
  return next;
}
