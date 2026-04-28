import { CmsArticleFormScreen } from "@/features/cms/articles/screens/article-form-screen";
import { prefetchArticleById, prefetchArticleFormOptions } from "@/lib/cms/trpc/server-prefetch";
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
  const [initialData, initialOptionsData] = await Promise.all([
    prefetchArticleById(id).catch(() => undefined),
    prefetchArticleFormOptions(),
  ]);

  return (
    <CmsArticleFormScreen
      mode="edit"
      articleId={id}
      initialData={initialData}
      initialOptionsData={initialOptionsData}
    />
  );
}
