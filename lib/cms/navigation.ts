export type CmsNavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

export const cmsNavigation: CmsNavItem[] = [
  { label: "Dashboard", href: "/cms" },
  { label: "Issues", href: "/cms/issues" },
  { label: "Categories", href: "/cms/categories" },
  { label: "Tags", href: "/cms/tags" },
  { label: "Articles", href: "/cms/articles" },
  { label: "Users", href: "/cms/users", adminOnly: true },
];
