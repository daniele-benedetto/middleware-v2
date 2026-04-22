import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/lib/server/modules/users/schema";

export const usersService = {
  async list() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users list is not implemented yet");
  },
  async getById(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users detail is not implemented yet");
  },
  async create(_input: CreateUserInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users create is not implemented yet");
  },
  async update(_id: string, _input: UpdateUserInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users update is not implemented yet");
  },
  async updateRole(_id: string, _input: UpdateUserRoleInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users role update is not implemented yet");
  },
  async hardDelete(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Users hard delete is not implemented yet");
  },
};
