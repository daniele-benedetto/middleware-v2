import "server-only";

import { hashPassword } from "better-auth/crypto";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { usersRepository } from "@/lib/server/modules/users/repository";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
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
  createdAt: Date;
  updatedAt: Date;
  authoredArticles?: Array<{
    id: string;
    title: string;
    status: ArticleStatus;
    isFeatured: boolean;
    position: number;
  }>;
  _count?: {
    authoredArticles: number;
  };
}): UserDetailDto => ({
  ...toUserDto(user),
  articles: (user.authoredArticles ?? []).map((article) => ({
    id: article.id,
    title: article.title,
    status: article.status,
    isFeatured: article.isFeatured,
    position: article.position,
  })),
});

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
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await usersRepository.create({
        email: input.email,
        name: input.name,
        role: input.role,
        emailVerified: true,
        passwordHash,
      });
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
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;

    try {
      await usersRepository.update(id, {
        name: input.name,
        passwordHash,
      });
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
