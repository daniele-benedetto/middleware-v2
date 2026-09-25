import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicQuestionnairePage } from "@/components/public/pages/public-questionnaire-page";
import { i18n } from "@/lib/i18n";
import { getPublicQuestionnairePageData } from "@/lib/public/server/questionnaire-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const questionnaire = await getPublicQuestionnairePageData(slug);
  return questionnaire
    ? buildPageMetadata({
        title: questionnaire.title,
        path: `/questionari/${questionnaire.slug}`,
        index: false,
      })
    : buildPageMetadata({
        title: i18n.public.metadata.questionnaireNotFound,
        path: `/questionari/${slug}`,
        index: false,
      });
}

async function Content({ params }: Props) {
  const questionnaire = await getPublicQuestionnairePageData((await params).slug);
  if (!questionnaire) notFound();
  return <PublicQuestionnairePage questionnaire={questionnaire} />;
}

export default function PublicQuestionnaireRoute({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          className="flex flex-1 items-center justify-center"
          role="status"
          aria-busy="true"
        >
          {i18n.public.questionnaire.loading}
        </main>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
