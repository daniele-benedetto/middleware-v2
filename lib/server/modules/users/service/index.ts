import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { usersRepository } from "@/lib/server/modules/users/repository";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { UserDetailDto, UserListItemDto } from "@/lib/server/modules/users/dto";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

const toUserDto = (user: {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR";
  createdAt: Date;
}): UserListItemDto => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
};

export const usersService = {
  async list(query: ListUsersQuery, pagination: PaginationParams) {
    const [users, total] = await Promise.all([
      usersRepository.list(query, pagination),
      usersRepository.count(query),
    ]);

    return {
      items: users.map(toUserDto),
      total,
    };
  },
  async getById(id: string) {
    const user = await usersRepository.getById(id);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    return toUserDto(user) satisfies UserDetailDto;
  },
  async create(input: CreateUserInput) {
    try {
      const user = await usersRepository.create(input);
      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "User email already exists");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateUserInput) {
    try {
      const user = await usersRepository.update(id, input);
      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      throw error;
    }
  },
  async updateRole(id: string, input: UpdateUserRoleInput) {
    try {
      const user = await usersRepository.updateRole(id, input);
      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      throw error;
    }
  },
  async hardDelete(id: string) {
    try {
      await usersRepository.hardDelete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError(409, "CONFLICT", "User cannot be deleted due to related records");
      }

      throw error;
    }
  },
};
