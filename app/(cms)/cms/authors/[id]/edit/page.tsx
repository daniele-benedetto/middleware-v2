import { CmsAuthorFormScreen } from "@/features/cms/authors/screens/author-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchAuthorById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.authors}`,
  path: "/cms/authors/[id]/edit",
});

type CmsAuthorEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsAuthorEditPage({ params }: CmsAuthorEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchAuthorById(id));

  return <CmsAuthorFormScreen mode="edit" authorId={id} initialData={initialData} />;
}
