import { CmsNavigationBuilderScreen } from "@/features/cms/navigation/screens/navigation-builder-screen";
import { prefetchNavigationBuilder } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.publicNavigation,
  description: i18n.cms.navigationBuilder.subtitle,
  path: "/cms/navigation",
});

export default async function CmsNavigationPage() {
  const initialData = await prefetchNavigationBuilder();
  return <CmsNavigationBuilderScreen initialData={initialData} />;
}
