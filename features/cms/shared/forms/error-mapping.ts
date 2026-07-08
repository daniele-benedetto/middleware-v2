import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

import type { CmsUiError } from "@/lib/cms/trpc";

type ConflictResource =
  | "issues"
  | "authors"
  | "categories"
  | "users"
  | "articles"
  | "pages"
  | "courses"
  | "lessons";

const conflictTitles: Record<ConflictResource, string> = {
  issues: i18n.cms.trpcErrors.conflictTitle,
  authors: i18n.cms.trpcErrors.domain.authorSlugExistsTitle,
  categories: i18n.cms.trpcErrors.conflictTitle,
  users: i18n.cms.trpcErrors.conflictTitle,
  articles: i18n.cms.lists.articles.domainErrors.slugConflictTitle,
  pages: i18n.cms.trpcErrors.domain.pageSlugExistsTitle,
  courses: i18n.cms.trpcErrors.conflictTitle,
  lessons: i18n.cms.trpcErrors.conflictTitle,
};

export function mapCrudDomainError(error: unknown, resource: ConflictResource): CmsUiError {
  const uiError = mapTrpcErrorToCmsUiMessage(error);

  if (uiError.reason) {
    return uiError;
  }

  if (uiError.code === "CONFLICT") {
    return {
      ...uiError,
      title: conflictTitles[resource],
    };
  }

  return uiError;
}
