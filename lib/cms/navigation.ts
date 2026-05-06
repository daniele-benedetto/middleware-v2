import { i18n } from "@/lib/i18n";

export type CmsNavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
  notInDashboardPage?: boolean;
};

export const cmsNavigation: CmsNavItem[] = [
  { label: i18n.cms.navigation.dashboard, href: "/cms", notInDashboardPage: true },
  { label: i18n.cms.navigation.issues, href: "/cms/issues" },
  { label: i18n.cms.navigation.categories, href: "/cms/categories" },
  { label: i18n.cms.navigation.tags, href: "/cms/tags" },
  { label: i18n.cms.navigation.articles, href: "/cms/articles" },
  { label: i18n.cms.navigation.media, href: "/cms/media" },
  { label: i18n.cms.navigation.auditLogs, href: "/cms/audit-logs", adminOnly: true },
  { label: i18n.cms.navigation.users, href: "/cms/users", adminOnly: true },
];
