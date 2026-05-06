import { ApiError } from "@/lib/server/http/api-error";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";

describe("assertPublishedAtConsistency", () => {
  it("allows published articles with a publishedAt date", () => {
    expect(() => assertPublishedAtConsistency("PUBLISHED", new Date())).not.toThrow();
  });

  it("allows non-published articles without a publishedAt date", () => {
    expect(() => assertPublishedAtConsistency("DRAFT", null)).not.toThrow();
    expect(() => assertPublishedAtConsistency("ARCHIVED", null)).not.toThrow();
  });

  it("rejects published articles without publishedAt", () => {
    expect(() => assertPublishedAtConsistency("PUBLISHED", null)).toThrow(ApiError);
    expect(() => assertPublishedAtConsistency("PUBLISHED", null)).toThrow(
      "publishedAt is required when status is PUBLISHED",
    );
  });

  it("rejects non-published articles with publishedAt", () => {
    expect(() => assertPublishedAtConsistency("DRAFT", new Date())).toThrow(ApiError);
    expect(() => assertPublishedAtConsistency("ARCHIVED", new Date())).toThrow(
      "publishedAt is allowed only when status is PUBLISHED",
    );
  });
});
