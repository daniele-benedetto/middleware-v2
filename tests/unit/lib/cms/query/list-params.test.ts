import { parseMapItemsListSearchParams, parseMapsListSearchParams } from "@/lib/cms/query";

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

describe("parseMapItemsListSearchParams", () => {
  it("normalizes pagination, map filtering, search, and sorting", () => {
    expect(
      parseMapItemsListSearchParams({
        page: "2",
        pageSize: "10",
        q: "  Piazza Grande  ",
        mapId: "00000000-0000-4000-8000-000000000001",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      query: {
        q: "Piazza Grande",
        mapId: "00000000-0000-4000-8000-000000000001",
        sortBy: "title",
        sortOrder: "asc",
      },
    });
  });

  it("uses defaults and discards invalid map and sorting values", () => {
    expect(parseMapItemsListSearchParams({ mapId: "invalid", sortBy: "sortOrder" })).toEqual({
      page: 1,
      pageSize: 20,
      query: { sortBy: "updatedAt", sortOrder: "desc" },
    });
  });
});
