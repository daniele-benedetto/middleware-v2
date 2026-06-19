import { ApiError } from "@/lib/server/http/api-error";

type PublishableStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export function assertPublishedAtConsistency(
  status: PublishableStatus,
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
