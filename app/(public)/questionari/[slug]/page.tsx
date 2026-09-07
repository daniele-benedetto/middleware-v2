import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicQuestionnairePage } from "@/components/public/pages/public-questionnaire-page";
import { getPublicQuestionnairePageData } from "@/lib/public/server/questionnaire-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const questionnaire = await getPublicQuestionnairePageData(slug);
  return questionnaire
    ? buildPageMetadata({ title: questionnaire.title, path: `/questionari/${questionnaire.slug}` })
    : buildPageMetadata({
        title: "Questionario non trovato",
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
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}
