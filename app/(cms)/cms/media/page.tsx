import { CmsMediaScreen } from "@/features/cms/media/screens/media-screen";
import { prefetchMediaList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.media,
  description: i18n.cms.lists.media.subtitle,
  path: "/cms/media",
});

export default async function CmsMediaPage() {
  const initialData = await prefetchMediaList();

  return <CmsMediaScreen initialData={initialData} />;
}
