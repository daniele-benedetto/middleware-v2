import {
  createCmsDomainErrorDetails,
  type CmsDomainErrorReason,
} from "@/lib/cms/errors/domain-error-details";

import type { CmsUiError } from "@/lib/cms/trpc/error-messages";

type CmsTrpcErrorCode = CmsUiError["code"];

type CreateCmsTrpcErrorInput = {
  code?: CmsTrpcErrorCode;
  message?: string;
  details?: unknown;
  reason?: CmsDomainErrorReason;
  includeCause?: boolean;
  causeCode?: string;
  shapeCode?: CmsTrpcErrorCode;
};

export function createCmsTrpcError({
  code,
  message,
  details,
  reason,
  includeCause = false,
  causeCode,
  shapeCode,
}: CreateCmsTrpcErrorInput) {
  const resolvedDetails = reason ? createCmsDomainErrorDetails(reason) : details;
  const error: {
    code?: string;
    message?: string;
    cause?: unknown;
    data?: { code?: string; details?: unknown };
    shape?: { data?: { code?: string } };
  } = {};

  if (code) {
    error.code = code;
  }

  if (message) {
    error.message = message;
  }

  if (resolvedDetails !== undefined || code) {
    error.data = {
      code,
      details: resolvedDetails,
    };
  }

  if (shapeCode) {
    error.shape = {
      data: {
        code: shapeCode,
      },
    };
  }

  if (includeCause) {
    error.cause = {
      ...(causeCode ? { code: causeCode } : code ? { code } : {}),
      ...(message ? { message } : {}),
      ...(resolvedDetails && typeof resolvedDetails === "object" ? resolvedDetails : {}),
    };
  }

  return error;
}
