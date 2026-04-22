import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/server/modules/categories/schema";

export const categoriesService = {
  async list() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Categories list is not implemented yet");
  },
  async getById(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Categories detail is not implemented yet");
  },
  async create(_input: CreateCategoryInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Categories create is not implemented yet");
  },
  async update(_id: string, _input: UpdateCategoryInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Categories update is not implemented yet");
  },
  async hardDelete(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Categories hard delete is not implemented yet");
  },
};
