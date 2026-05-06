import {
  isCmsDomainErrorDetails,
  type CmsDomainErrorReason,
} from "@/lib/cms/errors/domain-error-details";
import { i18n } from "@/lib/i18n";

type SupportedCmsErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "NOT_FOUND"
  | "TOO_MANY_REQUESTS"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR";

export type CmsUiError = {
  code: SupportedCmsErrorCode;
  title: string;
  description: string;
  reason?: CmsDomainErrorReason;
  retryable: boolean;
};

type TrpcLikeError = {
  code?: string;
  message?: string;
  cause?: unknown;
  shape?: {
    data?: {
      code?: string;
    };
  };
  data?: {
    code?: string;
    details?: unknown;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCauseObject(error: TrpcLikeError) {
  return isObject(error.cause) ? error.cause : undefined;
}

function readTrpcCode(error: unknown): SupportedCmsErrorCode | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const trpcError = error as TrpcLikeError;
  const data = trpcError.data;
  const cause = readCauseObject(trpcError);
  const causeCode = typeof cause?.code === "string" ? cause.code : undefined;
  const code = trpcError.code ?? data?.code ?? trpcError.shape?.data?.code ?? causeCode;

  if (
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    code === "CONFLICT" ||
    code === "NOT_FOUND" ||
    code === "TOO_MANY_REQUESTS" ||
    code === "BAD_REQUEST" ||
    code === "INTERNAL_SERVER_ERROR"
  ) {
    return code;
  }

  return undefined;
}

function readErrorMessage(error: unknown): string | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const trpcError = error as TrpcLikeError;
  const cause = readCauseObject(trpcError);

  if (typeof trpcError.message === "string" && trpcError.message.length > 0) {
    return trpcError.message;
  }

  if (typeof cause?.message === "string" && cause.message.length > 0) {
    return cause.message;
  }

  return undefined;
}

function readErrorDetails(error: unknown) {
  if (!isObject(error)) {
    return undefined;
  }

  const trpcError = error as TrpcLikeError;

  return trpcError.data?.details ?? trpcError.cause;
}

function readDomainErrorReason(error: unknown) {
  const details = readErrorDetails(error);

  if (!isCmsDomainErrorDetails(details)) {
    return undefined;
  }

  return details.reason;
}

export function hasCmsTrpcErrorCode(
  error: unknown,
  code: SupportedCmsErrorCode,
): error is TrpcLikeError {
  return readTrpcCode(error) === code;
}

export function isCmsNotFoundLikeError(error: unknown) {
  if (hasCmsTrpcErrorCode(error, "NOT_FOUND")) {
    return true;
  }

  const message = readErrorMessage(error);

  return typeof message === "string" && /not found/i.test(message);
}

function readBadRequestDetails(error: unknown) {
  const details = readErrorDetails(error);

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details) && details.length > 0 && typeof details[0] === "string") {
    return details[0];
  }

  return undefined;
}

function mapDomainError(
  code: SupportedCmsErrorCode,
  reason: CmsDomainErrorReason | undefined,
): CmsUiError | null {
  if (!reason) {
    return null;
  }

  const text = i18n.cms.trpcErrors.domain;
  const articleText = i18n.cms.lists.articles.domainErrors;

  if (code === "CONFLICT" && reason === "ARTICLE_SLUG_EXISTS_IN_ISSUE") {
    return {
      code,
      reason,
      title: articleText.slugConflictTitle,
      description: articleText.slugConflictDescription,
      retryable: false,
    };
  }

  if (code === "BAD_REQUEST" && reason === "ARTICLE_INVALID_RELATIONS") {
    return {
      code,
      reason,
      title: articleText.invalidRelationsTitle,
      description: articleText.invalidRelationsDescription,
      retryable: false,
    };
  }

  if (code === "BAD_REQUEST" && reason === "ARTICLE_INVALID_TAGS") {
    return {
      code,
      reason,
      title: articleText.invalidTagsTitle,
      description: articleText.invalidTagsDescription,
      retryable: false,
    };
  }

  if (code === "BAD_REQUEST" && reason === "ARTICLE_REORDER_IDS_MISMATCH") {
    return {
      code,
      reason,
      title: articleText.reorderInvalidTitle,
      description: articleText.reorderInvalidDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "CATEGORY_DELETE_HAS_ARTICLES") {
    return {
      code,
      reason,
      title: text.categoryDeleteHasArticlesTitle,
      description: text.categoryDeleteHasArticlesDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "CATEGORY_SLUG_EXISTS") {
    return {
      code,
      reason,
      title: text.categorySlugExistsTitle,
      description: text.categorySlugExistsDescription,
      retryable: false,
    };
  }

  if (code === "BAD_REQUEST" && reason === "ISSUE_ARTICLE_ORDER_MISMATCH") {
    return {
      code,
      reason,
      title: text.issueArticleOrderMismatchTitle,
      description: text.issueArticleOrderMismatchDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "ISSUE_DELETE_HAS_ARTICLES") {
    return {
      code,
      reason,
      title: text.issueDeleteHasArticlesTitle,
      description: text.issueDeleteHasArticlesDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "ISSUE_SLUG_EXISTS") {
    return {
      code,
      reason,
      title: text.issueSlugExistsTitle,
      description: text.issueSlugExistsDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "TAG_DELETE_HAS_ARTICLES") {
    return {
      code,
      reason,
      title: text.tagDeleteHasArticlesTitle,
      description: text.tagDeleteHasArticlesDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "TAG_SLUG_EXISTS") {
    return {
      code,
      reason,
      title: text.tagSlugExistsTitle,
      description: text.tagSlugExistsDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "USER_DELETE_HAS_AUTHORED_ARTICLES") {
    return {
      code,
      reason,
      title: text.userDeleteHasArticlesTitle,
      description: text.userDeleteHasArticlesDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT" && reason === "USER_EMAIL_EXISTS") {
    return {
      code,
      reason,
      title: text.userEmailExistsTitle,
      description: text.userEmailExistsDescription,
      retryable: false,
    };
  }

  if (code === "FORBIDDEN" && reason === "USER_SELF_DELETE_FORBIDDEN") {
    return {
      code,
      reason,
      title: text.userSelfDeleteForbiddenTitle,
      description: text.userSelfDeleteForbiddenDescription,
      retryable: false,
    };
  }

  if (code === "FORBIDDEN" && reason === "USER_SELF_ROLE_CHANGE_FORBIDDEN") {
    return {
      code,
      reason,
      title: text.userSelfRoleChangeForbiddenTitle,
      description: text.userSelfRoleChangeForbiddenDescription,
      retryable: false,
    };
  }

  return null;
}

export function mapTrpcErrorToCmsUiMessage(error: unknown): CmsUiError {
  const text = i18n.cms.trpcErrors;
  const code = readTrpcCode(error) ?? "INTERNAL_SERVER_ERROR";
  const reason = readDomainErrorReason(error);
  const mappedDomainError = mapDomainError(code, reason);

  if (mappedDomainError) {
    return mappedDomainError;
  }

  if (code === "UNAUTHORIZED") {
    return {
      code,
      reason,
      title: text.unauthorizedTitle,
      description: text.unauthorizedDescription,
      retryable: false,
    };
  }

  if (code === "FORBIDDEN") {
    return {
      code,
      reason,
      title: text.forbiddenTitle,
      description: text.forbiddenDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT") {
    return {
      code,
      reason,
      title: text.conflictTitle,
      description: text.conflictDescription,
      retryable: false,
    };
  }

  if (code === "NOT_FOUND") {
    return {
      code,
      reason,
      title: text.notFoundTitle,
      description: text.notFoundDescription,
      retryable: false,
    };
  }

  if (code === "TOO_MANY_REQUESTS") {
    return {
      code,
      reason,
      title: text.tooManyRequestsTitle,
      description: text.tooManyRequestsDescription,
      retryable: true,
    };
  }

  if (code === "BAD_REQUEST") {
    const detail = readBadRequestDetails(error);

    return {
      code,
      reason,
      title: text.badRequestTitle,
      description: detail ?? text.badRequestDescription,
      retryable: false,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    reason,
    title: text.internalErrorTitle,
    description: text.internalErrorDescription,
    retryable: true,
  };
}
