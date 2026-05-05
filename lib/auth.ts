import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";
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
});
