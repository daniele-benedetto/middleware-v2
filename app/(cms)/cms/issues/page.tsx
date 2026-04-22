import { CmsResourcePage } from "@/components/cms/pages";
import { i18n } from "@/lib/i18n";

export default function CmsIssuesPage() {
  const text = i18n.cms;

  return <CmsResourcePage title={text.navigation.issues} subtitle={text.resource.subtitle} />;
}
