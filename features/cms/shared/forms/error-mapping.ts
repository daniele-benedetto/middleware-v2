import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

import type { CmsUiError } from "@/lib/cms/trpc";

type ConflictResource = "issues" | "categories" | "tags" | "users" | "articles";

const conflictTitles: Record<ConflictResource, string> = {
  issues: i18n.cms.trpcErrors.conflictTitle,
  categories: i18n.cms.trpcErrors.conflictTitle,
  tags: i18n.cms.trpcErrors.conflictTitle,
  users: i18n.cms.trpcErrors.conflictTitle,
  articles: i18n.cms.lists.articles.domainErrors.slugConflictTitle,
};

export function mapCrudDomainError(error: unknown, resource: ConflictResource): CmsUiError {
  const uiError = mapTrpcErrorToCmsUiMessage(error);

  if (uiError.code === "CONFLICT") {
    return {
      ...uiError,
      title: conflictTitles[resource],
    };
  }

  return uiError;
}
