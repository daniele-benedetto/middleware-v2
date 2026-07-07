import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ArticleListenPlayer } from "@/components/public/listen/article-listen-player";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
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

export function LessonListenPage({ data }: LessonListenPageProps) {
  const { lesson, chunks } = data;
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
      <article className="grid min-h-[calc(100svh-112px)] grid-rows-[auto_minmax(0,1fr)]">
        <PublicPageHero
          as="header"
          title={lesson.title}
          titleStyled={lesson.titleStyled}
          backgroundCode="AU"
          containerClassName="pt-7 pb-5 sm:pt-9 sm:pb-6 lg:pt-10 lg:pb-7"
          meta={<PublicMetaRail items={metaItems} />}
        />

        <section
          className="min-h-0 bg-surface py-4 sm:py-5 lg:py-6"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
        >
          <div className={`${publicContentClassName} h-full min-h-0`}>
            <ArticleListenPlayer
              articleId={lesson.id}
              articleSlug={lesson.slug}
              articleTitle={lesson.title}
              articleUpdatedAt={lesson.updatedAt}
              audioUrl={lesson.audioUrl ?? ""}
              chunks={chunks}
              emptyState={<ListenEmptyState />}
            />
          </div>
        </section>
      </article>
    </main>
  );
}
