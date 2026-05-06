const categoriesRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/server/modules/categories/repository", () => ({
  categoriesRepository: categoriesRepositoryMock,
}));

import { categoriesService } from "@/lib/server/modules/categories/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

function createCategoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "category-1",
    name: "Politics",
    slug: "politics",
    description: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    _count: { articles: 3 },
    ...overrides,
  };
}

describe("categoriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a category using the normalized name when slug is missing", async () => {
    categoriesRepositoryMock.create.mockResolvedValue({ id: "category-1" });
    categoriesRepositoryMock.getById.mockResolvedValue(createCategoryRecord());

    const result = await categoriesService.create({
      name: "  Politics & News  ",
      description: null,
      isActive: true,
    });

    expect(categoriesRepositoryMock.create).toHaveBeenCalledWith({
      name: "  Politics & News  ",
      description: null,
      isActive: true,
      slug: "politics-news",
    });
    expect(result).toMatchObject({
      id: "category-1",
      slug: "politics",
      articlesCount: 3,
    });
  });

  it("maps duplicate slug errors to a domain conflict", async () => {
    categoriesRepositoryMock.create.mockRejectedValue(
      createPrismaKnownRequestError("P2002", "duplicate slug"),
    );

    await expect(
      categoriesService.create({
        name: "Politics",
        slug: "politics",
        description: null,
        isActive: true,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "CATEGORY_SLUG_EXISTS" },
    });
  });

  it("maps delete relation errors to a domain conflict", async () => {
    categoriesRepositoryMock.delete.mockRejectedValue(
      createPrismaKnownRequestError("P2003", "fk constraint"),
    );

    await expect(categoriesService.delete("category-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "CATEGORY_DELETE_HAS_ARTICLES" },
    });
  });

  it("maps update not found errors to NOT_FOUND", async () => {
    categoriesRepositoryMock.update.mockRejectedValue(
      createPrismaKnownRequestError("P2025", "missing category"),
    );

    await expect(categoriesService.update("missing", { name: "Updated" })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
