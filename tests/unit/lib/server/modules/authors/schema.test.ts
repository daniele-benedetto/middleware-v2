import {
  createAuthorInputSchema,
  listAuthorsQuerySchema,
} from "@/lib/server/modules/authors/schema";

describe("authors schemas", () => {
  it("accepts optional bioRich on create", () => {
    expect(
      createAuthorInputSchema.parse({
        name: "Maria Rossi",
        bioRich: { type: "doc", content: [] },
      }),
    ).toMatchObject({
      name: "Maria Rossi",
      isActive: true,
    });
  });

  it("parses list query defaults", () => {
    expect(listAuthorsQuerySchema.parse({ q: "  maria  " })).toEqual({
      q: "maria",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });
});
