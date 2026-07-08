import {
  createCategoryInputSchema,
  listCategoriesQuerySchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories/schema";
import { deleteMediaInputSchema, renameMediaInputSchema } from "@/lib/server/modules/media/schema";

describe("categories/media schemas", () => {
  it("applies category defaults and trims strings", () => {
    const parsed = createCategoryInputSchema.parse({
      name: "  Politics  ",
      slug: "  politics  ",
    });

    expect(parsed).toEqual({
      name: "Politics",
      slug: "politics",
      isActive: true,
    });
  });

  it("rejects empty category updates", () => {
    expect(updateCategoryInputSchema.safeParse({}).success).toBe(false);
  });

  it("parses category list query defaults and booleans", () => {
    expect(listCategoriesQuerySchema.parse({ isActive: "true" })).toEqual({
      isActive: true,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("validates rename media input", () => {
    expect(
      renameMediaInputSchema.parse({
        url: " /api/public/media/blob?pathname=covers%2Ffile.jpg ",
        name: "  hero-image  ",
      }),
    ).toEqual({
      url: "/api/public/media/blob?pathname=covers%2Ffile.jpg",
      name: "hero-image",
    });
    expect(renameMediaInputSchema.safeParse({ url: "", name: "x" }).success).toBe(false);
  });

  it("validates delete media input", () => {
    expect(
      deleteMediaInputSchema.parse({
        url: " /api/public/media/blob?pathname=covers%2Ffile.jpg ",
      }),
    ).toEqual({
      url: "/api/public/media/blob?pathname=covers%2Ffile.jpg",
    });
  });
});
