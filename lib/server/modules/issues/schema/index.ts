export type CreateIssueInput = {
  title: string;
  slug: string;
  description?: string;
};

export type UpdateIssueInput = Partial<CreateIssueInput>;
