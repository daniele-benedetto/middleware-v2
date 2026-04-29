import { CmsCategoryFormScreen } from "@/features/cms/categories/screens/category-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchCategoryById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.categories}`,
  path: "/cms/categories/[id]/edit",
});

type CmsCategoryEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsCategoryEditPage({ params }: CmsCategoryEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchCategoryById(id));

  return <CmsCategoryFormScreen mode="edit" categoryId={id} initialData={initialData} />;
}
