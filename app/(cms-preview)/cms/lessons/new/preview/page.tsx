import { LessonLivePreviewPage } from "@/features/cms/preview/lesson-live-preview-page";
import { toLessonLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsNewLessonPreviewPageProps = {
  searchParams: Promise<{ session?: string }>;
};

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.lessons.newPreviewMetadataTitle,
  path: "/cms/lessons/new/preview",
});

export default async function CmsNewLessonPreviewPage({
  searchParams,
}: CmsNewLessonPreviewPageProps) {
  const { session } = await searchParams;
  const sessionId = session || "new";

  return (
    <LessonLivePreviewPage
      sessionId={sessionId}
      initialSnapshot={toLessonLivePreviewSnapshot({
        courseId: "",
        courseSlug: "anteprima-corso",
        courseTitle: i18n.cms.forms.resources.lessons.previewCourseTitle,
        title: i18n.cms.forms.resources.lessons.untitledPreviewTitle,
        titleStyled: null,
        slug: "anteprima-lezione",
        excerptRich: emptyContentDoc,
        contentRich: emptyContentDoc,
        imageUrl: null,
        imageAlt: null,
        audioUrl: null,
        audioChunks: null,
        sortOrder: 0,
        statusLabel: i18n.cms.forms.resources.lessons.newPreviewStatus,
        publicAvailable: false,
      })}
      lessonNumber={null}
      otherLessons={[]}
      previousLesson={null}
      nextLesson={null}
      editHref="/cms/lessons/new"
      refreshHref={`/cms/lessons/new/preview?session=${encodeURIComponent(sessionId)}`}
    />
  );
}
