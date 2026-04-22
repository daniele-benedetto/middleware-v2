export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "METHOD_NOT_ALLOWED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      console.error("API_ERROR", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    const safeDetails = error.code === "VALIDATION_ERROR" ? error.details : undefined;

    return Response.json(
      {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          details: safeDetails,
        },
        meta: null,
      },
      { status: error.status },
    );
  }

  console.error("UNEXPECTED_API_ERROR", error);

  return Response.json(
    {
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
      },
      meta: null,
    },
    { status: 500 },
  );
}
