import { trpc } from "@/lib/trpc/react";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

type MutationInput = {
  id?: string;
  ids?: string[];
  key?: string;
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
  | "courses.create"
  | "courses.update"
  | "courses.delete"
  | "courses.reorder"
  | "lessons.create"
  | "lessons.update"
  | "lessons.delete"
  | "lessons.reorder"
  | "lessons.publish"
  | "lessons.unpublish"
  | "lessons.archive"
  | "categories.create"
  | "categories.update"
  | "categories.delete"
  | "authors.create"
  | "authors.update"
  | "authors.delete"
  | "users.create"
  | "users.update"
  | "users.updateRole"
  | "users.delete"
  | "articles.create"
  | "articles.update"
  | "articles.delete"
  | "articles.publish"
  | "articles.unpublish"
  | "articles.archive"
  | "pages.create"
  | "pages.update"
  | "pages.delete"
  | "pages.publish"
  | "pages.unpublish"
  | "pages.archive"
  | "navigation.update";

export async function invalidateIssuesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.issues.list.invalidate, utils.issues.getById.invalidate, input);
}

export async function invalidateCoursesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.courses.list.invalidate, utils.courses.getById.invalidate, input);
}

export async function invalidateLessonsAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await Promise.all([
    invalidateResource(utils.lessons.list.invalidate, utils.lessons.getById.invalidate, input),
    utils.courses.list.invalidate(),
    utils.courses.getById.invalidate(),
  ]);
}

export async function invalidateCategoriesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(
    utils.categories.list.invalidate,
    utils.categories.getById.invalidate,
    input,
  );
}

export async function invalidateAuthorsAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.authors.list.invalidate, utils.authors.getById.invalidate, input);
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

export async function invalidatePagesAfterMutation(utils: TrpcUtils, input?: MutationInput) {
  await invalidateResource(utils.pages.list.invalidate, utils.pages.getById.invalidate, input);
}

export async function invalidateNavigationAfterMutation(utils: TrpcUtils) {
  await Promise.all([
    utils.navigation.listMenus.invalidate(),
    utils.navigation.listOptions.invalidate({ type: "page" }),
    utils.navigation.listOptions.invalidate({ type: "article" }),
    utils.navigation.listOptions.invalidate({ type: "issue" }),
  ]);
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

  if (mutation.startsWith("courses.")) {
    await invalidateCoursesAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("lessons.")) {
    await invalidateLessonsAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("categories.")) {
    await invalidateCategoriesAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("authors.")) {
    await invalidateAuthorsAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("users.")) {
    await invalidateUsersAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("pages.")) {
    await invalidatePagesAfterMutation(utils, input);
    return;
  }

  if (mutation.startsWith("navigation.")) {
    await invalidateNavigationAfterMutation(utils);
    return;
  }

  await invalidateArticlesAfterMutation(utils, input);
}
