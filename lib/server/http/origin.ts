import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

export function enforceSameOrigin(request: Request): void {
  const origin = request.headers.get("origin")?.trim();

  if (!origin) {
    throw new ApiError(403, "FORBIDDEN", "Missing request origin");
  }

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(403, "FORBIDDEN", "Invalid request origin");
  }
}
