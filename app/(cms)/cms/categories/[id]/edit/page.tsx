import { CmsCategoryFormScreen } from "@/features/cms/categories/screens/category-form-screen";
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
  const { id } = await params;
  const initialData = await prefetchCategoryById(id).catch(() => undefined);
  return <CmsCategoryFormScreen mode="edit" categoryId={id} initialData={initialData} />;
}
