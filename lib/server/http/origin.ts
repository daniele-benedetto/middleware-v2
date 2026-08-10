import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost && forwardedProto) {
    return new URL(`${forwardedProto}://${forwardedHost}`).origin;
  }

  return new URL(request.url).origin;
}

export function enforceSameOrigin(request: Request): void {
  const origin = request.headers.get("origin")?.trim();

  if (!origin) {
    throw new ApiError(403, "FORBIDDEN", "Missing request origin");
  }

  try {
    if (new URL(origin).origin !== getRequestOrigin(request)) {
      throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(403, "FORBIDDEN", "Invalid request origin");
  }
}
