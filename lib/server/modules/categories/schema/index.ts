export type CreateCategoryInput = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
