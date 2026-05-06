import {
  createCategoryInputSchema,
  listCategoriesQuerySchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories/schema";
import { deleteMediaInputSchema, renameMediaInputSchema } from "@/lib/server/modules/media/schema";
import {
  createTagInputSchema,
  listTagsQuerySchema,
  updateTagInputSchema,
} from "@/lib/server/modules/tags/schema";

describe("categories/tag/media schemas", () => {
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

  it("applies tag defaults and trims strings", () => {
    const parsed = createTagInputSchema.parse({
      name: "  Audio  ",
      slug: "  audio  ",
    });

    expect(parsed).toEqual({
      name: "Audio",
      slug: "audio",
      isActive: true,
    });
  });

  it("rejects empty tag updates", () => {
    expect(updateTagInputSchema.safeParse({}).success).toBe(false);
  });

  it("parses tag list query defaults and booleans", () => {
    expect(listTagsQuerySchema.parse({ isActive: "false" })).toEqual({
      isActive: false,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("validates rename media input", () => {
    expect(
      renameMediaInputSchema.parse({
        url: " https://example.com/file.jpg ",
        name: "  hero-image  ",
      }),
    ).toEqual({
      url: "https://example.com/file.jpg",
      name: "hero-image",
    });
    expect(renameMediaInputSchema.safeParse({ url: "invalid", name: "x" }).success).toBe(false);
  });

  it("validates delete media input", () => {
    expect(
      deleteMediaInputSchema.parse({
        url: " https://example.com/file.jpg ",
      }),
    ).toEqual({
      url: "https://example.com/file.jpg",
    });
  });
});
