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
  retryable: boolean;
};

type TrpcLikeError = {
  message?: string;
  data?: {
    code?: string;
    details?: unknown;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readTrpcCode(error: unknown): SupportedCmsErrorCode | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const data = (error as TrpcLikeError).data;
  const code = data?.code;

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

function readBadRequestDetails(error: unknown) {
  if (!isObject(error)) {
    return undefined;
  }

  const details = (error as TrpcLikeError).data?.details;

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details) && details.length > 0 && typeof details[0] === "string") {
    return details[0];
  }

  return undefined;
}

export function mapTrpcErrorToCmsUiMessage(error: unknown): CmsUiError {
  const text = i18n.cms.trpcErrors;
  const code = readTrpcCode(error) ?? "INTERNAL_SERVER_ERROR";

  if (code === "UNAUTHORIZED") {
    return {
      code,
      title: text.unauthorizedTitle,
      description: text.unauthorizedDescription,
      retryable: false,
    };
  }

  if (code === "FORBIDDEN") {
    return {
      code,
      title: text.forbiddenTitle,
      description: text.forbiddenDescription,
      retryable: false,
    };
  }

  if (code === "CONFLICT") {
    return {
      code,
      title: text.conflictTitle,
      description: text.conflictDescription,
      retryable: false,
    };
  }

  if (code === "NOT_FOUND") {
    return {
      code,
      title: text.notFoundTitle,
      description: text.notFoundDescription,
      retryable: false,
    };
  }

  if (code === "TOO_MANY_REQUESTS") {
    return {
      code,
      title: text.tooManyRequestsTitle,
      description: text.tooManyRequestsDescription,
      retryable: true,
    };
  }

  if (code === "BAD_REQUEST") {
    const detail = readBadRequestDetails(error);

    return {
      code,
      title: text.badRequestTitle,
      description: detail ?? text.badRequestDescription,
      retryable: false,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    title: text.internalErrorTitle,
    description: text.internalErrorDescription,
    retryable: true,
  };
}
