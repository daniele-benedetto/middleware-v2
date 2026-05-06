export const cmsDomainErrorReasons = [
  "ARTICLE_INVALID_RELATIONS",
  "ARTICLE_INVALID_TAGS",
  "ARTICLE_REORDER_IDS_MISMATCH",
  "ARTICLE_SLUG_EXISTS_IN_ISSUE",
  "CATEGORY_DELETE_HAS_ARTICLES",
  "CATEGORY_SLUG_EXISTS",
  "ISSUE_ARTICLE_ORDER_MISMATCH",
  "ISSUE_DELETE_HAS_ARTICLES",
  "ISSUE_SLUG_EXISTS",
  "TAG_DELETE_HAS_ARTICLES",
  "TAG_SLUG_EXISTS",
  "USER_DELETE_HAS_AUTHORED_ARTICLES",
  "USER_EMAIL_EXISTS",
  "USER_SELF_DELETE_FORBIDDEN",
  "USER_SELF_ROLE_CHANGE_FORBIDDEN",
] as const;

export type CmsDomainErrorReason = (typeof cmsDomainErrorReasons)[number];

const cmsDomainErrorReasonSet = new Set<string>(cmsDomainErrorReasons);

export type CmsDomainErrorDetails = {
  reason: CmsDomainErrorReason;
};

export function createCmsDomainErrorDetails(reason: CmsDomainErrorReason): CmsDomainErrorDetails {
  return { reason };
}

export function isCmsDomainErrorDetails(value: unknown): value is CmsDomainErrorDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return cmsDomainErrorReasonSet.has((value as { reason?: unknown }).reason as string);
}
