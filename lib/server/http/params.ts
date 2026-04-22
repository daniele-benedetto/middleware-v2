import { ApiError } from "@/lib/server/http/api-error";

export async function getIdParam(paramsPromise: Promise<unknown>): Promise<string> {
  const params = await paramsPromise;

  if (typeof params !== "object" || params === null || !("id" in params)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid route params");
  }

  const id = (params as { id?: unknown }).id;

  if (typeof id !== "string" || id.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid id param");
  }

  return id;
}
