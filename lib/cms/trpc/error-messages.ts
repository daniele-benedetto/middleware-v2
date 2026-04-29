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
  code?: string;
  message?: string;
  cause?: {
    code?: string;
    message?: string;
  };
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

function readTrpcCode(error: unknown): SupportedCmsErrorCode | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const trpcError = error as TrpcLikeError;
  const data = trpcError.data;
  const code = trpcError.code ?? data?.code ?? trpcError.shape?.data?.code ?? trpcError.cause?.code;

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

  if (typeof trpcError.message === "string" && trpcError.message.length > 0) {
    return trpcError.message;
  }

  if (typeof trpcError.cause?.message === "string" && trpcError.cause.message.length > 0) {
    return trpcError.cause.message;
  }

  return undefined;
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
