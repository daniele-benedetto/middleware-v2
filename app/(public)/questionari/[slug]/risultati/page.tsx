import { notFound } from "next/navigation";

import { PublicQuestionnaireResultsPage } from "@/components/public/pages/public-questionnaire-results-page";
import { getQuestionnaireResultsPath } from "@/components/public/sections/questionnaires/analysis-format";
import { i18n } from "@/lib/i18n";
import { getPublicQuestionnaireResultsPageData } from "@/lib/public/server/questionnaire-page";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicQuestionnaireResultsRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicQuestionnaireResultsRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const analysis = await getPublicQuestionnaireResultsPageData(slug);

  if (!analysis) {
    return buildPageMetadata({
      title: i18n.public.metadata.questionnaireNotFound,
      path: getQuestionnaireResultsPath(slug),
      index: false,
    });
  }

  return buildPageMetadata({
    title: i18n.public.metadata.questionnaireResultsTitle(analysis.title),
    description:
      extractPlainText(analysis.descriptionRich) ||
      i18n.public.metadata.questionnaireResultsDescription(analysis.title),
    path: getQuestionnaireResultsPath(analysis.slug ?? slug),
  });
}

async function PublicQuestionnaireResultsRouteContent({
  params,
}: PublicQuestionnaireResultsRouteProps) {
  const { slug } = await params;
  const analysis = await getPublicQuestionnaireResultsPageData(slug);

  if (!analysis) {
    notFound();
  }

  return <PublicQuestionnaireResultsPage analysis={analysis} />;
}

export default function PublicQuestionnaireResultsRoute({
  params,
}: PublicQuestionnaireResultsRouteProps) {
  return <PublicQuestionnaireResultsRouteContent params={params} />;
}
