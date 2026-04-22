import "server-only";

export const categoriesRepository = {
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
};
