import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { ListenPlayer } from "@/components/public/listen/listen-player";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";

import type { PublicLessonListenPageData } from "@/lib/public/server/lesson-listen-page";
import type { CSSProperties } from "react";

type LessonListenPageProps = {
  data: PublicLessonListenPageData;
};

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

function formatLessonNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

export function LessonListenPage({ data }: LessonListenPageProps) {
  const { lesson, lessonNumber, chunks } = data;
  const text = i18n.public.lessonPage;
  const metaItems = [
    { key: "course", label: lesson.courseTitle, href: `/formazione/${lesson.courseSlug}` },
    { key: "date", label: formatLessonDate(lesson.publishedAt), dateTime: lesson.publishedAt },
    {
      key: "lesson",
      label: text.listen.backToLesson,
      href: `/formazione/${lesson.courseSlug}/${lesson.slug}`,
    },
  ];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article className="grid h-[calc(100svh-var(--public-header-height))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PublicPageHero
          as="header"
          title={lesson.title}
          titleStyled={lesson.titleStyled}
          backgroundCode={formatLessonNumber(lessonNumber)}
          backgroundCodeClassName="top-3 right-4 text-[clamp(86px,18vw,210px)] sm:top-4 lg:top-4"
          containerClassName="pt-5 pb-4 sm:pt-6 sm:pb-5 lg:pt-7 lg:pb-5"
          meta={<PublicMetaRail items={metaItems} />}
        />

        <section
          className="min-h-0 overflow-hidden bg-background"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
        >
          <div className={`${publicContentClassName} h-full min-h-0 py-3 sm:py-8 lg:py-10`}>
            <ListenPlayer
              contentKind="lesson"
              contentId={lesson.id}
              contentSlug={lesson.slug}
              contentTitle={lesson.title}
              contentUpdatedAt={lesson.updatedAt}
              audioUrl={lesson.audioUrl ?? ""}
              chunks={chunks}
              emptyState={<ListenEmptyState contentKind="lesson" />}
            />
          </div>
        </section>
      </article>
    </main>
  );
}
