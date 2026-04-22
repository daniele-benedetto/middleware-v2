import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

import type { CreateIssueInput, UpdateIssueInput } from "@/lib/server/modules/issues/schema";

export const issuesService = {
  async list() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Issues list is not implemented yet");
  },
  async getById(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Issues detail is not implemented yet");
  },
  async create(_input: CreateIssueInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Issues create is not implemented yet");
  },
  async update(_id: string, _input: UpdateIssueInput) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Issues update is not implemented yet");
  },
  async hardDelete(_id: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Issues hard delete is not implemented yet");
  },
};
