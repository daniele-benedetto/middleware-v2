import { trpc } from "@/lib/trpc/react";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

type MutationInput = {
  id?: string;
  ids?: string[];
};

type InvalidateDetail = (input: { id: string }) => Promise<void>;
type InvalidateList = () => Promise<void>;

function resolveInvalidationIds(input?: MutationInput) {
  if (!input) {
    return [];
  }

  const ids = [input.id, ...(input.ids ?? [])].filter((value): value is string => Boolean(value));
  return [...new Set(ids)];
}

function toDetailInvalidations(ids: string[], invalidator: InvalidateDetail) {
  return ids.map((id) => invalidator({ id }));
}

async function invalidateResource(
  invalidateList: InvalidateList,
  invalidateDetail: InvalidateDetail,
  input?: MutationInput,
) {
  const ids = resolveInvalidationIds(input);

  await Promise.all([invalidateList(), ...toDetailInvalidations(ids, invalidateDetail)]);
}

export type CmsMutationName =
  | "issues.create"
  | "issues.update"
  | "issues.delete"
  | "issues.reorder"
  | "categories.create"
  | "categories.update"
  | "categories.delete"
  | "tags.create"
  | "tags.update"
  | "tags.delete"
  | "users.create"
  | "users.update"
  | "users.updateRole"
  | "users.delete"
  | "articles.create"
  | "articles.update"
  | "articles.delete"
  | "articles.syncTags"
  | "articles.publish"
  | "articles.unpublish"
  | "articles.archive"
  | "articles.feature"
  | "articles.unfeature"
  | "articles.reorder";

export async function invalidateIssuesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.issues.list.invalidate, utils.issues.getById.invalidate, input);
}

export async function invalidateCategoriesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(
    utils.categories.list.invalidate,
    utils.categories.getById.invalidate,
    input,
  );
}

export async function invalidateTagsAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.tags.list.invalidate, utils.tags.getById.invalidate, input);
}

export async function invalidateUsersAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.users.list.invalidate, utils.users.getById.invalidate, input);
}

export async function invalidateArticlesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(
    utils.articles.list.invalidate,
    utils.articles.getById.invalidate,
    input,
  );
}

export async function invalidateAfterCmsMutation(
  utils: TrpcUtils,
  mutation: CmsMutationName,
  input?: MutationInput,
) {
  if (mutation.startsWith("issues.")) {
    await invalidateIssuesAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("categories.")) {
    await invalidateCategoriesAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("tags.")) {
    await invalidateTagsAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("users.")) {
    await invalidateUsersAfterMutation(utils, input);
    return;
  }

  await invalidateArticlesAfterMutation(utils, input);
}
