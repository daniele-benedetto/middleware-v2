import type { RouterInputs } from "@/lib/trpc/types";

export const articleTagOptionsInput = {
  page: 1,
  pageSize: 100,
  query: {
    sortBy: "name",
    sortOrder: "asc",
  },
} satisfies RouterInputs["tags"]["list"];

export const articleIssueOptionsInput = {
  page: 1,
  pageSize: 100,
  query: {
    sortBy: "sortOrder",
    sortOrder: "asc",
  },
} satisfies RouterInputs["issues"]["list"];

export const articleCategoryOptionsInput = {
  page: 1,
  pageSize: 100,
  query: {
    sortBy: "name",
    sortOrder: "asc",
  },
} satisfies RouterInputs["categories"]["list"];

export const articleAuthorOptionsInput = {
  page: 1,
  pageSize: 100,
  query: {},
} satisfies RouterInputs["users"]["listAuthors"];
