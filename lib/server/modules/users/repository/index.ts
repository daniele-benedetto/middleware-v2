import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateUserInput,
  ListUserAuthorsQuery,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

type CreateUserPersistInput = Omit<CreateUserInput, "password"> & {
  emailVerified?: boolean;
  passwordHash: string;
};

type UpdateUserPersistInput = Omit<UpdateUserInput, "password"> & {
  passwordHash?: string;
};

const toUserWhereInput = (query: ListUsersQuery): Prisma.UserWhereInput => {
  return {
    role: query.role,
    OR: query.q
      ? [
          { email: { contains: query.q, mode: "insensitive" } },
          { name: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toUserOrderByInput = (query: ListUsersQuery): Prisma.UserOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

const toUserAuthorsWhereInput = (query: ListUserAuthorsQuery): Prisma.UserWhereInput => {
  return {
    OR: query.q
      ? [
          { email: { contains: query.q, mode: "insensitive" } },
          { name: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

export const usersRepository = {
  async list(query: ListUsersQuery, pagination: PaginationParams) {
    const where = toUserWhereInput(query);
    const orderBy = toUserOrderByInput(query);

    return prisma.user.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            authoredArticles: true,
          },
        },
      },
    });
  },
  async count(query: ListUsersQuery) {
    const where = toUserWhereInput(query);
    return prisma.user.count({ where });
  },
  async listAuthorOptions(query: ListUserAuthorsQuery, pagination: PaginationParams) {
    const where = toUserAuthorsWhereInput(query);

    return prisma.user.findMany({
      where,
      orderBy: { email: "asc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  },
  async countAuthorOptions(query: ListUserAuthorsQuery) {
    const where = toUserAuthorsWhereInput(query);
    return prisma.user.count({ where });
  },
  async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        authoredArticles: {
          select: {
            id: true,
            title: true,
            status: true,
            isFeatured: true,
            position: true,
          },
          orderBy: [{ createdAt: "desc" }, { title: "asc" }],
        },
        _count: {
          select: {
            authoredArticles: true,
          },
        },
      },
    });
  },
  async create(input: CreateUserPersistInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          emailVerified: input.emailVerified ?? true,
        },
      });

      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: input.passwordHash,
        },
      });

      return user;
    });
  },
  async update(id: string, input: UpdateUserPersistInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          name: input.name,
          updatedAt: new Date(),
        },
      });

      if (input.passwordHash) {
        await tx.account.upsert({
          where: {
            providerId_accountId: {
              providerId: "credential",
              accountId: id,
            },
          },
          update: {
            password: input.passwordHash,
            userId: id,
            providerId: "credential",
            accountId: id,
          },
          create: {
            id: randomUUID(),
            userId: id,
            providerId: "credential",
            accountId: id,
            password: input.passwordHash,
          },
        });
      }

      return user;
    });
  },
  async updateRole(id: string, input: UpdateUserRoleInput) {
    return prisma.user.update({
      where: { id },
      data: {
        role: input.role,
      },
    });
  },
  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};
