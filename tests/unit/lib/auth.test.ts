const betterAuthMock = vi.hoisted(() => vi.fn((options: unknown) => ({ options })));
const prismaAdapterMock = vi.hoisted(() => vi.fn(() => "prisma-adapter"));
const authRateLimitStorageMock = vi.hoisted(() => ({}));

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: prismaAdapterMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/server/auth/rate-limit", () => ({
  authRateLimitStorage: authRateLimitStorageMock,
}));

import "@/lib/auth";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { usersPolicy } from "@/lib/server/modules/users/policy";

describe("auth configuration", () => {
  it("disables public email signup while keeping email/password login enabled", () => {
    expect(betterAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAndPassword: {
          enabled: true,
          disableSignUp: true,
        },
      }),
    );
  });

  it("keeps user creation restricted to administrators", () => {
    expect(usersPolicy.createAllowedRoles).toEqual([USER_ROLES.ADMIN]);
  });
});
