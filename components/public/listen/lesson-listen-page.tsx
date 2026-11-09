import { ListenCover } from "@/components/public/listen/listen-cover";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { ListenInfo } from "@/components/public/listen/listen-info";
import { ListenPlayer } from "@/components/public/listen/listen-player";
import { publicContentClassName } from "@/components/public/primitives";
import { LessonRelatedSection } from "@/components/public/sections/formazione/lesson-related-section";
import { i18n } from "@/lib/i18n";

import type { AudioChunk } from "@/lib/audio/audio-chunks";
import type { PublicLessonListenPageData } from "@/lib/public/server/lesson-listen-page";
import type { CSSProperties } from "react";

type LessonListenPageProps = {
  data: PublicLessonListenPageData;
  chunks: AudioChunk[];
};

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

export function LessonListenPage({ data, chunks }: LessonListenPageProps) {
  const { lesson } = data;
  const text = i18n.public.lessonPage;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article>
        <div
          className={`${publicContentClassName} h-[calc(100svh-var(--public-issue-chrome-height))] py-4 lg:py-10`}
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "120ms" } as CSSProperties}
        >
          <ListenPlayer
            contentKind="lesson"
            contentId={lesson.id}
            contentSlug={lesson.slug}
            contentTitle={lesson.title}
            contentUpdatedAt={lesson.updatedAt}
            audioUrl={lesson.audioUrl ?? ""}
            chunks={chunks}
            emptyState={<ListenEmptyState contentKind="lesson" />}
            cover={<ListenCover imageUrl={lesson.imageUrl} imageAlt={lesson.imageAlt} />}
            info={
              <ListenInfo
                kicker={[
                  {
                    key: "course",
                    label: lesson.courseTitle,
                    href: `/contro-formazione/${lesson.courseSlug}`,
                  },
                ]}
                title={lesson.title}
                titleStyled={lesson.titleStyled}
                meta={[
                  {
                    key: "date",
                    label: formatLessonDate(lesson.publishedAt),
                    dateTime: lesson.publishedAt,
                  },
                ]}
                backLink={{
                  href: `/contro-formazione/${lesson.courseSlug}/${lesson.slug}`,
                  label: text.listen.backToLesson,
                }}
              />
            }
          />
        </div>
        <LessonRelatedSection courseSlug={lesson.courseSlug} otherLessons={data.otherLessons} />
      </article>
    </main>
  );
}
