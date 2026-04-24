import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

import type { CmsUiError } from "@/lib/cms/trpc";

type ConflictResource = "issues" | "categories" | "tags" | "users" | "articles";

const conflictTitles: Record<ConflictResource, string> = {
  issues: "Conflitto slug Issue",
  categories: "Conflitto slug Categoria",
  tags: "Conflitto slug Tag",
  users: "Conflitto email Utente",
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
