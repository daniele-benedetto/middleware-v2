import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { usersRepository } from "@/lib/server/modules/users/repository";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  UserAuthorOptionDto,
  UserDetailDto,
  UserListItemDto,
} from "@/lib/server/modules/users/dto";
import type {
  CreateUserInput,
  ListUserAuthorsQuery,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

const toUserAuthorOptionDto = (user: {
  id: string;
  email: string;
  name: string | null;
}): UserAuthorOptionDto => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
};

const toUserDto = (user: {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR";
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    authoredArticles: number;
  };
}): UserListItemDto => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    authoredArticlesCount: user._count?.authoredArticles ?? 0,
  };
};

const toUserDetailDto = (user: {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR";
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    authoredArticles: number;
  };
}): UserDetailDto => {
  return {
    ...toUserDto(user),
    image: user.image,
  };
};

function assertCanManageOtherUser(actorUserId: string, targetUserId: string, message: string) {
  if (actorUserId === targetUserId) {
    throw new ApiError(403, "FORBIDDEN", message);
  }
}

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
  async listAuthorOptions(query: ListUserAuthorsQuery, pagination: PaginationParams) {
    const [users, total] = await Promise.all([
      usersRepository.listAuthorOptions(query, pagination),
      usersRepository.countAuthorOptions(query),
    ]);

    return {
      items: users.map(toUserAuthorOptionDto),
      total,
    };
  },
  async getById(id: string) {
    const user = await usersRepository.getById(id);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    return toUserDetailDto(user);
  },
  async create(input: CreateUserInput) {
    try {
      const user = await usersRepository.create(input);
      const userWithRelations = await usersRepository.getById(user.id);

      if (!userWithRelations) {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      return toUserDto(userWithRelations);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "User email already exists");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateUserInput) {
    try {
      await usersRepository.update(id, input);
      const user = await usersRepository.getById(id);

      if (!user) {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      throw error;
    }
  },
  async updateRole(actorUserId: string, id: string, input: UpdateUserRoleInput) {
    assertCanManageOtherUser(actorUserId, id, "Administrators cannot change their own role");

    try {
      await usersRepository.updateRole(id, input);
      const user = await usersRepository.getById(id);

      if (!user) {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      throw error;
    }
  },
  async delete(actorUserId: string, id: string) {
    assertCanManageOtherUser(actorUserId, id, "Administrators cannot delete their own account");

    try {
      await usersRepository.delete(id);
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
