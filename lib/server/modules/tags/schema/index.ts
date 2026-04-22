export type CreateTagInput = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateTagInput = Partial<CreateTagInput>;
