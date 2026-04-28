import { CmsArticleFormScreen } from "@/features/cms/articles/screens/article-form-screen";
import { prefetchArticleById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.articles}`,
  path: "/cms/articles/[id]/edit",
});

type CmsArticleEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsArticleEditPage({ params }: CmsArticleEditPageProps) {
  const { id } = await params;
  const initialData = await prefetchArticleById(id).catch(() => undefined);
  return <CmsArticleFormScreen mode="edit" articleId={id} initialData={initialData} />;
}
