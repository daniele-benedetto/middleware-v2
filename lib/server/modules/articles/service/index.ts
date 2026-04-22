import "server-only";

import { ApiError } from "@/lib/server/http/api-error";

import type {
  CreateArticleInput,
  ReorderArticlesInput,
  SyncArticleTagsInput,
  UpdateArticleInput,
} from "@/lib/server/modules/articles/schema";

const notImplemented = (message: string): never => {
  throw new ApiError(501, "NOT_IMPLEMENTED", message);
};

export const articlesService = {
  async list() {
    return notImplemented("Articles list is not implemented yet");
  },
  async getById(_id: string) {
    return notImplemented("Articles detail is not implemented yet");
  },
  async create(_input: CreateArticleInput) {
    return notImplemented("Articles create is not implemented yet");
  },
  async update(_id: string, _input: UpdateArticleInput) {
    return notImplemented("Articles update is not implemented yet");
  },
  async hardDelete(_id: string) {
    return notImplemented("Articles hard delete is not implemented yet");
  },
  async syncTags(_id: string, _input: SyncArticleTagsInput) {
    return notImplemented("Articles tag sync is not implemented yet");
  },
  async publish(_id: string) {
    return notImplemented("Articles publish is not implemented yet");
  },
  async unpublish(_id: string) {
    return notImplemented("Articles unpublish is not implemented yet");
  },
  async archive(_id: string) {
    return notImplemented("Articles archive is not implemented yet");
  },
  async feature(_id: string) {
    return notImplemented("Articles feature is not implemented yet");
  },
  async unfeature(_id: string) {
    return notImplemented("Articles unfeature is not implemented yet");
  },
  async reorder(_input: ReorderArticlesInput) {
    return notImplemented("Articles reorder is not implemented yet");
  },
};
