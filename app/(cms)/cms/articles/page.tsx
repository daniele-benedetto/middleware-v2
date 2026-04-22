import { CmsResourcePage } from "@/components/cms/pages";
import { i18n } from "@/lib/i18n";

export default function CmsArticlesPage() {
  const text = i18n.cms;

  return <CmsResourcePage title={text.navigation.articles} subtitle={text.resource.subtitle} />;
}
