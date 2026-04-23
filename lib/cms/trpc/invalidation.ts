import { trpc } from "@/lib/trpc/react";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

type MutationWithId = { id?: string };

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

export async function invalidateIssuesAfterMutation(utils: TrpcUtils, input?: MutationWithId) {
  await utils.issues.list.invalidate();

  if (input?.id) {
    await utils.issues.getById.invalidate({ id: input.id });
  }
}

export async function invalidateCategoriesAfterMutation(utils: TrpcUtils, input?: MutationWithId) {
  await utils.categories.list.invalidate();

  if (input?.id) {
    await utils.categories.getById.invalidate({ id: input.id });
  }
}

export async function invalidateTagsAfterMutation(utils: TrpcUtils, input?: MutationWithId) {
  await utils.tags.list.invalidate();

  if (input?.id) {
    await utils.tags.getById.invalidate({ id: input.id });
  }
}

export async function invalidateUsersAfterMutation(utils: TrpcUtils, input?: MutationWithId) {
  await utils.users.list.invalidate();

  if (input?.id) {
    await utils.users.getById.invalidate({ id: input.id });
  }
}

export async function invalidateArticlesAfterMutation(utils: TrpcUtils, input?: MutationWithId) {
  await utils.articles.list.invalidate();

  if (input?.id) {
    await utils.articles.getById.invalidate({ id: input.id });
  }
}

export async function invalidateAfterCmsMutation(
  utils: TrpcUtils,
  mutation: CmsMutationName,
  input?: MutationWithId,
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
