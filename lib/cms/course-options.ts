import type { RouterInputs } from "@/lib/trpc/types";

export const lessonCourseOptionsInput = {
  page: 1,
  pageSize: 100,
  query: {
    sortBy: "sortOrder",
    sortOrder: "asc",
  },
} satisfies RouterInputs["courses"]["list"];
