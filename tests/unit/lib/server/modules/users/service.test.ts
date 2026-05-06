const hashPasswordMock = vi.hoisted(() => vi.fn());

const usersRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  listAuthorOptions: vi.fn(),
  countAuthorOptions: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateRole: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock("@/lib/server/modules/users/repository", () => ({
  usersRepository: usersRepositoryMock,
}));

import { usersService } from "@/lib/server/modules/users/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

function createUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "editor@example.com",
    name: "Editor",
    role: "EDITOR",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    _count: { authoredArticles: 2 },
    authoredArticles: [],
    ...overrides,
  };
}

describe("usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue("hashed-password");
  });

  it("creates users with a hashed password and verified email", async () => {
    usersRepositoryMock.create.mockResolvedValue({ id: "user-1" });
    usersRepositoryMock.getById.mockResolvedValue(createUserRecord());

    const result = await usersService.create({
      email: "editor@example.com",
      name: "Editor",
      password: "super-secret",
      role: "EDITOR",
    });

    expect(hashPasswordMock).toHaveBeenCalledWith("super-secret");
    expect(usersRepositoryMock.create).toHaveBeenCalledWith({
      email: "editor@example.com",
      name: "Editor",
      role: "EDITOR",
      emailVerified: true,
      passwordHash: "hashed-password",
    });
    expect(result).toMatchObject({
      id: "user-1",
      email: "editor@example.com",
      authoredArticlesCount: 2,
    });
  });

  it("maps duplicate email errors to a domain conflict", async () => {
    usersRepositoryMock.create.mockRejectedValue(
      createPrismaKnownRequestError("P2002", "duplicate email"),
    );

    await expect(
      usersService.create({
        email: "editor@example.com",
        name: "Editor",
        password: "super-secret",
        role: "EDITOR",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "USER_EMAIL_EXISTS" },
    });
  });

  it("forbids changing your own role", async () => {
    await expect(
      usersService.updateRole("user-1", "user-1", { role: "ADMIN" }),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      details: { reason: "USER_SELF_ROLE_CHANGE_FORBIDDEN" },
    });
    expect(usersRepositoryMock.updateRole).not.toHaveBeenCalled();
  });

  it("forbids deleting your own account", async () => {
    await expect(usersService.delete("user-1", "user-1")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      details: { reason: "USER_SELF_DELETE_FORBIDDEN" },
    });
    expect(usersRepositoryMock.delete).not.toHaveBeenCalled();
  });

  it("maps delete relation errors to a domain conflict", async () => {
    usersRepositoryMock.delete.mockRejectedValue(
      createPrismaKnownRequestError("P2003", "fk constraint"),
    );

    await expect(usersService.delete("admin-1", "user-2")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "USER_DELETE_HAS_AUTHORED_ARTICLES" },
    });
  });

  it("updates users without hashing when password is omitted", async () => {
    usersRepositoryMock.update.mockResolvedValue(undefined);
    usersRepositoryMock.getById.mockResolvedValue(createUserRecord({ name: "Updated" }));

    const result = await usersService.update("user-1", { name: "Updated", password: undefined });

    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(usersRepositoryMock.update).toHaveBeenCalledWith("user-1", {
      name: "Updated",
      passwordHash: undefined,
    });
    expect(result).toMatchObject({ name: "Updated" });
  });
});
