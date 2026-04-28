export const cmsCrudRoutesEnabled = true;

export const cmsCrudRoutes = {
  issues: {
    create: "/cms/issues/new",
    edit: (id: string) => `/cms/issues/${id}/edit`,
  },
  categories: {
    create: "/cms/categories/new",
    edit: (id: string) => `/cms/categories/${id}/edit`,
  },
  tags: {
    create: "/cms/tags/new",
    edit: (id: string) => `/cms/tags/${id}/edit`,
  },
  articles: {
    create: "/cms/articles/new",
    edit: (id: string) => `/cms/articles/${id}/edit`,
  },
  users: {
    create: "/cms/users/new",
    edit: (id: string) => `/cms/users/${id}/edit`,
  },
} as const;
