import { ApiError } from "@/lib/server/http/api-error";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";

export function assertPublishedAtConsistency(
  status: ArticleStatus,
  publishedAt: Date | null,
): void {
  if (status === "PUBLISHED" && !publishedAt) {
    throw new ApiError(400, "VALIDATION_ERROR", "publishedAt is required when status is PUBLISHED");
  }

  if (status !== "PUBLISHED" && publishedAt) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "publishedAt is allowed only when status is PUBLISHED",
    );
  }
}
