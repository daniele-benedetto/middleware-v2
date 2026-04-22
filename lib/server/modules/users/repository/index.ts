import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

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

export const usersRepository = {
  async list(query: ListUsersQuery, pagination: PaginationParams) {
    const where = toUserWhereInput(query);
    const orderBy = toUserOrderByInput(query);

    return prisma.user.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });
  },
  async count(query: ListUsersQuery) {
    const where = toUserWhereInput(query);
    return prisma.user.count({ where });
  },
  async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },
  async create(input: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
      },
    });
  },
  async update(id: string, input: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        image: input.image,
      },
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
