import { PrintEditionPreview } from "@/components/cms/print/print-edition-preview";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssueById } from "@/lib/cms/trpc/server-prefetch";
import { buildIssueNumberMap } from "@/lib/public/format/issue";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";
import { getPublicPrintIssueBySlug } from "@/lib/public/server/print-preview";

import type { Metadata } from "next";

type PrintIssuePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Preview numero cartaceo",
};

export default async function PrintIssuePage({ params }: PrintIssuePageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const cmsIssue = await prefetchCmsDetailOrNotFound(() => prefetchIssueById(id));
  const [printIssue, publishedIssues] = await Promise.all([
    getPublicPrintIssueBySlug(cmsIssue.slug),
    getPublicPublishedIssues("cms.printPreview"),
  ]);
  const issueNumber = buildIssueNumberMap(publishedIssues).get(id) ?? "01";

  return (
    <PrintEditionPreview
      issue={{
        issueId: printIssue.issue.id,
        issueNumber,
        title: printIssue.issue.title,
        description: printIssue.issue.description,
        articles: printIssue.articles.map((article) => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          authorName: article.authorName,
          readingTimeMinutes: article.readingTimeMinutes,
          contentRich: article.contentRich,
        })),
        courses: printIssue.issue.courses.map((course) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          lessons: course.lessons.map((lesson) => ({
            title: lesson.title,
            readingTimeMinutes: lesson.readingTimeMinutes,
          })),
        })),
        maps: printIssue.issue.maps.map((map) => ({
          id: map.id,
          title: map.title,
          descriptionRich: map.descriptionRich,
          items: map.items.map((item) => ({ title: item.title })),
        })),
        questionnaireAnalyses: printIssue.issue.questionnaireAnalyses.map((analysis) => ({
          id: analysis.id,
          title: analysis.title,
          descriptionRich: analysis.descriptionRich,
          fields: analysis.fields.map((field) => ({ label: field.label })),
        })),
        homeBlocks: (printIssue.issue.homeBlocks ?? []).map((block) => {
          if (block.type === "course") return { type: block.type, courseId: block.courseId };
          if (block.type === "map") return { type: block.type, mapId: block.mapId };
          if (block.type === "questionnaireAnalysis") {
            return { type: block.type, questionnaireId: block.questionnaireId };
          }
          if (block.type === "preview") {
            return { type: block.type, previewIssueId: block.previewIssueId };
          }
          return { type: block.type, articleIds: block.articleIds };
        }),
      }}
    />
  );
}
