import { i18n } from "@/lib/i18n";

export type CmsResourceKey = "issues" | "categories" | "tags" | "articles";

type ResourceCopy = {
  title: string;
  subtitle: string;
};

const resourceTitleByKey: Record<CmsResourceKey, string> = {
  issues: i18n.cms.navigation.issues,
  categories: i18n.cms.navigation.categories,
  tags: i18n.cms.navigation.tags,
  articles: i18n.cms.navigation.articles,
};

export function toResourceCopy(resource: CmsResourceKey): ResourceCopy {
  return {
    title: resourceTitleByKey[resource],
    subtitle: i18n.cms.resource.subtitle,
  };
}
