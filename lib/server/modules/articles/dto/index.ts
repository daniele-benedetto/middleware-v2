export type ArticleDto = {
  id: string;
  issueId: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
};
