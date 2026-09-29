import { PrintEditionEditForm } from "@/components/cms/print/print-edition-edit-form";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssueById, prefetchPrintEditionById } from "@/lib/cms/trpc/server-prefetch";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PrintEditionEditPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = buildCmsMetadata({
  title: "Modifica edizione cartacea",
  description: "Modifica titolo e stato di un’edizione cartacea.",
  path: "/cms/print/editions/[id]/edit",
});

export default async function PrintEditionEditPage({ params }: PrintEditionEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchPrintEditionById(id));
  const issue = await prefetchCmsDetailOrNotFound(() => prefetchIssueById(initialData.issueId));
  const articleTitles = new Map(issue.articles.map((article) => [article.id, article.title]));
  const configuredArticleIds = (issue.homeBlocks ?? []).flatMap((block) =>
    "articleIds" in block ? block.articleIds : [],
  );
  const articleIds =
    configuredArticleIds.length > 0
      ? configuredArticleIds
      : issue.articles.map((article) => article.id);
  const items = [...new Set(articleIds)].flatMap((articleId) => {
    const title = articleTitles.get(articleId);
    return title ? [{ id: articleId, title, kind: "article" }] : [];
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <header className="border-b-2 border-foreground pb-5">
        <p className="font-ui text-[10px] font-extrabold tracking-[0.12em] text-accent uppercase">
          Preparazione editoriale
        </p>
        <h1 className="mt-2 font-heading text-3xl font-black tracking-[-0.04em]">
          Modifica edizione
        </h1>
      </header>
      <PrintEditionEditForm initialData={initialData} items={items} />
    </div>
  );
}
