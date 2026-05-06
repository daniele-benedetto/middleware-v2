import {
  createUserInputSchema,
  listUserAuthorsQuerySchema,
  listUsersQuerySchema,
  updateUserInputSchema,
  updateUserRoleInputSchema,
} from "@/lib/server/modules/users/schema";

describe("users schemas", () => {
  it("normalizes email on create", () => {
    const parsed = createUserInputSchema.parse({
      email: "  Editor@Example.COM  ",
      name: "Editor",
      password: "supersecret",
      role: "EDITOR",
    });

    expect(parsed.email).toBe("editor@example.com");
  });

  it("rejects too-short passwords on create", () => {
    expect(
      createUserInputSchema.safeParse({
        email: "editor@example.com",
        password: "short",
        role: "EDITOR",
      }).success,
    ).toBe(false);
  });

  it("rejects empty update payloads", () => {
    expect(updateUserInputSchema.safeParse({}).success).toBe(false);
  });

  it("accepts nullable names in user update", () => {
    expect(updateUserInputSchema.parse({ name: null })).toEqual({ name: null });
  });

  it("restricts role updates to allowed roles", () => {
    expect(updateUserRoleInputSchema.parse({ role: "ADMIN" })).toEqual({ role: "ADMIN" });
    expect(updateUserRoleInputSchema.safeParse({ role: "WRITER" }).success).toBe(false);
  });

  it("parses list query defaults", () => {
    expect(listUsersQuerySchema.parse({})).toEqual({
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("trims optional author search query", () => {
    expect(listUserAuthorsQuerySchema.parse({ q: "  maria  " })).toEqual({ q: "maria" });
  });
});
