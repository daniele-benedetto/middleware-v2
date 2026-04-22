import { TRPCError } from "@trpc/server";

import { ApiError } from "@/lib/server/http/api-error";

const apiErrorCodeToTrpcCode: Record<ApiError["code"], TRPCError["code"]> = {
  VALIDATION_ERROR: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  METHOD_NOT_ALLOWED: "METHOD_NOT_SUPPORTED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

export function toTrpcError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new TRPCError({
      code: apiErrorCodeToTrpcCode[error.code],
      message: error.message,
      cause: error.details,
    });
  }

  console.error("UNEXPECTED_TRPC_ERROR", error);

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
  });
}
