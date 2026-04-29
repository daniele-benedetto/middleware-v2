import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { prisma } from "../lib/prisma";

const ADMIN_NAME = "Daniele Benedetto";
const ADMIN_PASSWORD = "Asdf1234!";
const ADMIN_EMAIL = "daniele.benedetto@outlook.it";
const PRUNE_OTHER_USERS = false;

async function main() {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {
      name: ADMIN_NAME,
      role: "ADMIN",
      emailVerified: true,
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: admin.id,
      },
    },
    update: {
      password: passwordHash,
      userId: admin.id,
      providerId: "credential",
      accountId: admin.id,
    },
    create: {
      id: randomUUID(),
      userId: admin.id,
      providerId: "credential",
      accountId: admin.id,
      password: passwordHash,
    },
  });

  if (PRUNE_OTHER_USERS) {
    await prisma.article.updateMany({
      where: {
        authorId: {
          not: admin.id,
        },
      },
      data: {
        authorId: admin.id,
      },
    });

    await prisma.session.deleteMany({
      where: {
        userId: {
          not: admin.id,
        },
      },
    });

    await prisma.account.deleteMany({
      where: {
        userId: {
          not: admin.id,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          not: admin.id,
        },
      },
    });
  }

  const totalUsers = await prisma.user.count();

  console.log("Admin user + credential ready:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    emailVerified: admin.emailVerified,
    totalUsers,
    prunedOthers: PRUNE_OTHER_USERS,
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
