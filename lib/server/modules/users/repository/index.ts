import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

export const usersRepository = {
  async list() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
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
  async hardDelete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};
