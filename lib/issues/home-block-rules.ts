import type {
  IssueHomeArticleBlock,
  IssueHomeBlock,
  IssueHomeCourseBlock,
  IssueHomeMapBlock,
} from "@/lib/server/modules/issues/schema";

export function isArticleHomeBlock(block: IssueHomeBlock): block is IssueHomeArticleBlock {
  return block.type !== "course" && block.type !== "map";
}

export function isSingleArticleBlock(type: IssueHomeArticleBlock["type"]) {
  return type === "opening" || type === "rupture" || type === "closing";
}

function supportsFeaturedPlacement(type: IssueHomeArticleBlock["type"]) {
  return type === "body" || type === "rupture" || type === "closing";
}

export function normalizeHomeBlock(block: IssueHomeArticleBlock): IssueHomeArticleBlock {
  const articleIds = isSingleArticleBlock(block.type)
    ? block.articleIds.slice(0, 1)
    : block.articleIds;
  const featuredArticleId =
    block.featuredArticleId && articleIds.includes(block.featuredArticleId)
      ? block.featuredArticleId
      : (articleIds[0] ?? null);

  return {
    ...block,
    articleIds,
    featuredArticleId,
    featuredPlacement: supportsFeaturedPlacement(block.type) ? block.featuredPlacement : "left",
  };
}

export function createHomeBlock(
  input: Omit<IssueHomeArticleBlock, "featuredArticleId"> & {
    featuredArticleId?: string | null;
  },
) {
  return normalizeHomeBlock({
    ...input,
    featuredArticleId: input.featuredArticleId ?? input.articleIds[0] ?? null,
  });
}

export function createEmptyHomeBlock(
  type: IssueHomeArticleBlock["type"] = "body",
  id = `${type}-${Date.now().toString(36)}`,
) {
  return createHomeBlock({
    id,
    type,
    articleIds: [],
    featuredArticleId: null,
    featuredPlacement: "left",
  });
}

export function createEmptyCourseHomeBlock(
  id = `course-${Date.now().toString(36)}`,
): IssueHomeCourseBlock {
  return { id, type: "course", courseId: null };
}

export function createEmptyMapHomeBlock(id = `map-${Date.now().toString(36)}`): IssueHomeMapBlock {
  return { id, type: "map", mapId: null };
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
