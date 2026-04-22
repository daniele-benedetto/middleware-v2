import { ZodError, type ZodType } from "zod";

import { ApiError } from "@/lib/server/http/api-error";

export function parseOutput<T>(value: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(500, "INTERNAL_ERROR", "Response validation failed", error.flatten());
    }

    throw error;
  }
}
