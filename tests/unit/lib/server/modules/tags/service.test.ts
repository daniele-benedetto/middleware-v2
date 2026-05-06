const tagsRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/server/modules/tags/repository", () => ({
  tagsRepository: tagsRepositoryMock,
}));

import { tagsService } from "@/lib/server/modules/tags/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

function createTagRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "tag-1",
    name: "Audio",
    slug: "audio",
    description: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    _count: { articles: 2 },
    ...overrides,
  };
}

describe("tagsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a tag using the normalized name when slug is missing", async () => {
    tagsRepositoryMock.create.mockResolvedValue({ id: "tag-1" });
    tagsRepositoryMock.getById.mockResolvedValue(createTagRecord());

    const result = await tagsService.create({
      name: "  Audio / Podcast  ",
      description: null,
      isActive: true,
    });

    expect(tagsRepositoryMock.create).toHaveBeenCalledWith({
      name: "  Audio / Podcast  ",
      description: null,
      isActive: true,
      slug: "audio-podcast",
    });
    expect(result).toMatchObject({
      id: "tag-1",
      slug: "audio",
      articlesCount: 2,
    });
  });

  it("maps duplicate slug errors to a domain conflict", async () => {
    tagsRepositoryMock.create.mockRejectedValue(
      createPrismaKnownRequestError("P2002", "duplicate slug"),
    );

    await expect(
      tagsService.create({
        name: "Audio",
        slug: "audio",
        description: null,
        isActive: true,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "TAG_SLUG_EXISTS" },
    });
  });

  it("maps delete relation errors to a domain conflict", async () => {
    tagsRepositoryMock.delete.mockRejectedValue(
      createPrismaKnownRequestError("P2003", "fk constraint"),
    );

    await expect(tagsService.delete("tag-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "TAG_DELETE_HAS_ARTICLES" },
    });
  });

  it("maps update not found errors to NOT_FOUND", async () => {
    tagsRepositoryMock.update.mockRejectedValue(
      createPrismaKnownRequestError("P2025", "missing tag"),
    );

    await expect(tagsService.update("missing", { name: "Updated" })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
