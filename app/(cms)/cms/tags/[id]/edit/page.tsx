import { CmsTagFormScreen } from "@/features/cms/tags/screens/tag-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchTagById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.tags}`,
  path: "/cms/tags/[id]/edit",
});

type CmsTagEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsTagEditPage({ params }: CmsTagEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchTagById(id));

  return <CmsTagFormScreen mode="edit" tagId={id} initialData={initialData} />;
}
