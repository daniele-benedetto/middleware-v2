import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";
import { authRateLimitStorage } from "@/lib/server/auth/rate-limit";
import { USER_ROLES } from "@/lib/server/auth/roles";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: USER_ROLES.EDITOR,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customStorage: authRateLimitStorage,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
});
