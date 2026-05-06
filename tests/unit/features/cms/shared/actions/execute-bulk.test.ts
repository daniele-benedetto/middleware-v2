import { executeBulk } from "@/features/cms/shared/actions";

describe("executeBulk", () => {
  it("tracks fulfilled and rejected operations", async () => {
    const result = await executeBulk(["a", "b", "c"], async (id) => {
      if (id === "b") {
        throw new Error("boom-b");
      }

      return `${id}-ok`;
    });

    expect(result).toEqual({
      success: 2,
      failed: 1,
      failures: [{ id: "b", error: expect.any(Error) }],
    });
    expect((result.failures[0]?.error as Error).message).toBe("boom-b");
  });

  it("returns an empty failure list when all operations succeed", async () => {
    const result = await executeBulk(["a"], async () => "ok");

    expect(result).toEqual({
      success: 1,
      failed: 0,
      failures: [],
    });
  });
});
