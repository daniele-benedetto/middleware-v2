import { z, ZodError, type ZodType } from "zod";

import { ApiError } from "@/lib/server/http/api-error";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid request payload", error.flatten());
    }

    throw error;
  }
}

export function parseWithZod<T>(value: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid request data", error.flatten());
    }

    throw error;
  }
}
