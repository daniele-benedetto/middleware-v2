export const cmsCrudRoutes = {
  issues: {
    create: "/cms/issues/new",
    edit: (id: string) => `/cms/issues/${id}/edit`,
  },
  categories: {
    create: "/cms/categories/new",
    edit: (id: string) => `/cms/categories/${id}/edit`,
  },
  authors: {
    create: "/cms/authors/new",
    edit: (id: string) => `/cms/authors/${id}/edit`,
  },
  articles: {
    create: "/cms/articles/new",
    edit: (id: string) => `/cms/articles/${id}/edit`,
  },
  courses: {
    create: "/cms/contro-formazioni/new",
    edit: (id: string) => `/cms/contro-formazioni/${id}/edit`,
  },
  lessons: {
    create: "/cms/incontri/new",
    edit: (id: string) => `/cms/incontri/${id}/edit`,
  },
  maps: {
    create: "/cms/maps/new",
    edit: (id: string) => `/cms/maps/${id}/edit`,
    items: {
      create: (mapId: string) => `/cms/maps/${mapId}/items/new`,
      edit: (mapId: string, itemId: string) => `/cms/maps/${mapId}/items/${itemId}/edit`,
    },
  },
  mapItems: {
    list: "/cms/map-items",
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
