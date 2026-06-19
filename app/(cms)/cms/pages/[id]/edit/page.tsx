import { CmsPageFormScreen } from "@/features/cms/pages/screens/page-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchPageById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.pages}`,
  path: "/cms/pages/[id]/edit",
});

type CmsPageEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsPageEditPage({ params }: CmsPageEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchPageById(id));

  return <CmsPageFormScreen mode="edit" pageId={id} initialData={initialData} />;
}
