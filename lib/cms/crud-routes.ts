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
  authors: {
    create: "/cms/authors/new",
    edit: (id: string) => `/cms/authors/${id}/edit`,
  },
  articles: {
    create: "/cms/articles/new",
    edit: (id: string) => `/cms/articles/${id}/edit`,
  },
  pages: {
    create: "/cms/pages/new",
    edit: (id: string) => `/cms/pages/${id}/edit`,
  },
  users: {
    create: "/cms/users/new",
    edit: (id: string) => `/cms/users/${id}/edit`,
  },
} as const;
