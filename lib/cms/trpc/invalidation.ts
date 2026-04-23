import { trpc } from "@/lib/trpc/react";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

type MutationInput = {
  id?: string;
  ids?: string[];
};

function resolveInvalidationIds(input?: MutationInput) {
  if (!input) {
    return [];
  }

  const ids = [input.id, ...(input.ids ?? [])].filter((value): value is string => Boolean(value));
  return [...new Set(ids)];
}

async function invalidateDetails(
  ids: string[],
  invalidator: (input: { id: string }) => Promise<void>,
) {
  await Promise.all(ids.map((id) => invalidator({ id })));
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
  await utils.issues.list.invalidate();
  await invalidateDetails(resolveInvalidationIds(input), utils.issues.getById.invalidate);
}

export async function invalidateCategoriesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await utils.categories.list.invalidate();
  await invalidateDetails(resolveInvalidationIds(input), utils.categories.getById.invalidate);
}

export async function invalidateTagsAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await utils.tags.list.invalidate();
  await invalidateDetails(resolveInvalidationIds(input), utils.tags.getById.invalidate);
}

export async function invalidateUsersAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await utils.users.list.invalidate();
  await invalidateDetails(resolveInvalidationIds(input), utils.users.getById.invalidate);
}

export async function invalidateArticlesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await utils.articles.list.invalidate();
  await invalidateDetails(resolveInvalidationIds(input), utils.articles.getById.invalidate);
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
