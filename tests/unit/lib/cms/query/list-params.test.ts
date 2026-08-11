import { parseMapsListSearchParams } from "@/lib/cms/query";

describe("parseMapsListSearchParams", () => {
  it("normalizes pagination, search, and sort direction for the maps table", () => {
    expect(
      parseMapsListSearchParams({
        page: "2",
        pageSize: "10",
        q: "  Modena  ",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      query: {
        q: "Modena",
        sortOrder: "asc",
      },
    });
  });

  it("uses the default newest-first list state", () => {
    expect(parseMapsListSearchParams({})).toEqual({
      page: 1,
      pageSize: 20,
      query: {
        sortOrder: "desc",
      },
    });
  });
});
