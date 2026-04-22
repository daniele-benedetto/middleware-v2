import "server-only";

export const articlesRepository = {
  async list() {
    throw new Error("Not implemented");
  },
  async getById(_id: string) {
    throw new Error("Not implemented");
  },
  async create(_input: unknown) {
    throw new Error("Not implemented");
  },
  async update(_id: string, _input: unknown) {
    throw new Error("Not implemented");
  },
  async hardDelete(_id: string) {
    throw new Error("Not implemented");
  },
  async syncTags(_id: string, _tagIds: string[]) {
    throw new Error("Not implemented");
  },
  async publish(_id: string) {
    throw new Error("Not implemented");
  },
  async unpublish(_id: string) {
    throw new Error("Not implemented");
  },
  async archive(_id: string) {
    throw new Error("Not implemented");
  },
  async feature(_id: string) {
    throw new Error("Not implemented");
  },
  async unfeature(_id: string) {
    throw new Error("Not implemented");
  },
  async reorder(_input: unknown) {
    throw new Error("Not implemented");
  },
};
