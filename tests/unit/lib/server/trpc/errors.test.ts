import { TRPCError } from "@trpc/server";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { ApiError } from "@/lib/server/http/api-error";
import { toTrpcError } from "@/lib/server/trpc/errors";

describe("toTrpcError", () => {
  it("returns an existing TRPCError unchanged", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "Already mapped" });

    expect(toTrpcError(error)).toBe(error);
  });

  it("maps ApiError codes and preserves details as cause", () => {
    const details = createCmsDomainErrorDetails("CATEGORY_DELETE_HAS_ARTICLES");

    const error = toTrpcError(
      new ApiError(409, "CONFLICT", "Category cannot be deleted due to related records", details),
    );

    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("Category cannot be deleted due to related records");
    expect(error.cause).toMatchObject(details);
  });

  it("maps validation errors to BAD_REQUEST", () => {
    const error = toTrpcError(new ApiError(400, "VALIDATION_ERROR", "Invalid payload"));

    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Invalid payload");
  });

  it("logs unexpected errors and falls back to INTERNAL_SERVER_ERROR", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = toTrpcError(new Error("boom"));

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(error.message).toBe("Unexpected server error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("UNEXPECTED_TRPC_ERROR", expect.any(Error));
  });
});
