import { CourseLivePreviewPage } from "@/features/cms/preview/course-live-preview-page";
import { toCourseLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsNewCoursePreviewPageProps = {
  searchParams: Promise<{ session?: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.courses.newPreviewMetadataTitle,
  path: "/cms/contro-formazioni/new/preview",
});

export default async function CmsNewCoursePreviewPage({
  searchParams,
}: CmsNewCoursePreviewPageProps) {
  const { session } = await searchParams;
  const sessionId = session || "new";

  return (
    <CourseLivePreviewPage
      sessionId={sessionId}
      initialSnapshot={toCourseLivePreviewSnapshot({
        title: i18n.cms.forms.resources.courses.untitledPreviewTitle,
        titleStyled: null,
        slug: "anteprima-contro-formazione",
        description: null,
        homeVariant: "black",
        lessons: [],
        statusLabel: i18n.cms.forms.resources.courses.newPreviewStatus,
        publicAvailable: false,
      })}
      editHref="/cms/contro-formazioni/new"
      refreshHref={`/cms/contro-formazioni/new/preview?session=${encodeURIComponent(sessionId)}`}
    />
  );
}
