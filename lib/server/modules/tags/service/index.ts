import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

import type { CreateTagInput, UpdateTagInput } from "@/lib/server/modules/tags/schema";

export const tagsService = {
  async list() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Tags list is not implemented yet");
  },
  async getById(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Tags detail is not implemented yet");
  },
  async create(_input: CreateTagInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Tags create is not implemented yet");
  },
  async update(_id: string, _input: UpdateTagInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Tags update is not implemented yet");
  },
  async hardDelete(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Tags hard delete is not implemented yet");
  },
};
