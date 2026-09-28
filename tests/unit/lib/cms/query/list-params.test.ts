import { parseMapsListSearchParams } from "@/lib/cms/query";

describe("parseMapsListSearchParams", () => {
  it("normalizes pagination, filters, search, and sorting for the maps table", () => {
    expect(
      parseMapsListSearchParams({
        page: "2",
        pageSize: "10",
        q: "  Modena  ",
        isActive: "true",
        published: "false",
        sortBy: "publishedAt",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      query: {
        q: "Modena",
        isActive: "true",
        published: "false",
        sortBy: "publishedAt",
        sortOrder: "asc",
      },
    });
  });

  it("uses the default newest-first list state", () => {
    expect(parseMapsListSearchParams({})).toEqual({
      page: 1,
      pageSize: 20,
      query: {
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });
  });
});
