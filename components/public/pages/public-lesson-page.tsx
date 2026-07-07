import { ArrowLeftIcon, ArrowRightIcon, PlayIcon } from "lucide-react";
import Image from "next/image";

import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName, publicInteraction } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { PublicRichText } from "@/components/public/rich-text";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { editorialImageAlt } from "@/lib/public/format/image";
import { cn } from "@/lib/utils";

import type { PublicLessonSibling } from "@/lib/public/server/course-page";
import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";
import type { CSSProperties } from "react";

type PublicLessonPageProps = {
  lesson: PublicLessonDetailDto;
  lessonNumber: number | null;
  otherLessons: PublicCourseLessonSummaryDto[];
  previousLesson: PublicLessonSibling | null;
  nextLesson: PublicLessonSibling | null;
};

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

function formatLessonNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

function LessonMetaRail({ lesson }: { lesson: PublicLessonDetailDto }) {
  const text = i18n.public.lessonPage;
  const metaItems = [
    { key: "course", label: lesson.courseTitle, href: `/formazione/${lesson.courseSlug}` },
    { key: "readingTime", label: text.readingTimeLabel(lesson.readingTimeMinutes) },
    { key: "date", label: formatLessonDate(lesson.publishedAt), dateTime: lesson.publishedAt },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <PublicMetaRail items={metaItems} />

      {lesson.audioUrl ? (
        <Link
          href={`/formazione/${lesson.courseSlug}/${lesson.slug}/ascolta`}
          className="inline-flex w-fit shrink-0 items-center gap-2 pb-1 font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
        >
          <PlayIcon className="size-3.5 fill-current" aria-hidden />
          {text.audioCta}
        </Link>
      ) : null}
    </div>
  );
}

function LessonNavigation({
  courseSlug,
  previousLesson,
  nextLesson,
}: {
  courseSlug: string;
  previousLesson: PublicLessonSibling | null;
  nextLesson: PublicLessonSibling | null;
}) {
  const text = i18n.public.lessonPage;

  if (!previousLesson && !nextLesson) return null;

  return (
    <div className="grid gap-px border-t border-foreground md:grid-cols-2">
      {previousLesson ? (
        <Link
          href={`/formazione/${courseSlug}/${previousLesson.slug}`}
          className={cn(
            publicInteraction.cardSurface,
            "flex flex-col gap-2 border-b border-foreground bg-background px-5 py-6 sm:px-6 md:border-r",
          )}
        >
          <span className="inline-flex items-center gap-2 font-heading text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            {text.previousLabel}
          </span>
          <span className="font-heading text-[19px] leading-[1.1] font-black tracking-[-0.02em] text-foreground sm:text-[21px]">
            {previousLesson.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden className="hidden md:block" />
      )}

      {nextLesson ? (
        <Link
          href={`/formazione/${courseSlug}/${nextLesson.slug}`}
          className={cn(
            publicInteraction.cardSurface,
            "flex flex-col items-end gap-2 border-b border-foreground bg-background px-5 py-6 text-right sm:px-6",
          )}
        >
          <span className="inline-flex items-center gap-2 font-heading text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
            {text.nextLabel}
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </span>
          <span className="font-heading text-[19px] leading-[1.1] font-black tracking-[-0.02em] text-foreground sm:text-[21px]">
            {nextLesson.title}
          </span>
        </Link>
      ) : null}
    </div>
  );
}

function OtherLessonCard({
  courseSlug,
  lesson,
}: {
  courseSlug: string;
  lesson: PublicCourseLessonSummaryDto;
}) {
  const text = i18n.public.lessonPage;

  return (
    <Link
      href={`/formazione/${courseSlug}/${lesson.slug}`}
      className={cn(
        publicInteraction.cardSurface,
        "flex h-full flex-col border-r border-b border-foreground bg-background px-5 py-6 sm:px-6 md:px-7",
      )}
    >
      <span className="font-heading text-[11px] font-bold tracking-[0.08em] text-accent uppercase">
        {text.lessonLabel(lesson.sortOrder + 1)}
      </span>
      <h3 className="mt-3 font-heading text-[21px] leading-[1.08] font-black tracking-[-0.03em] text-foreground sm:text-[24px]">
        <StyledTitle title={lesson.title} titleStyled={lesson.titleStyled} />
      </h3>
      {lesson.excerpt ? (
        <p className="mt-4 font-editorial text-[16px] leading-normal text-body-text">
          {lesson.excerpt}
        </p>
      ) : null}
    </Link>
  );
}

function OtherLessonsSection({
  courseSlug,
  otherLessons,
}: {
  courseSlug: string;
  otherLessons: PublicCourseLessonSummaryDto[];
}) {
  const text = i18n.public.lessonPage;

  if (otherLessons.length === 0) return null;

  return (
    <section className="scroll-mt-20 bg-background py-12 lg:py-14">
      <div className={publicContentClassName}>
        <HomeSectionHeader
          title={text.otherLessonsTitle}
          action={{ label: text.viewCourse, href: `/formazione/${courseSlug}` }}
        />

        <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
          {otherLessons.map((lesson) => (
            <OtherLessonCard key={lesson.id} courseSlug={courseSlug} lesson={lesson} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicLessonPage({
  lesson,
  lessonNumber,
  otherLessons,
  previousLesson,
  nextLesson,
}: PublicLessonPageProps) {
  const text = i18n.public.lessonPage;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article>
        <PublicPageHero
          as="header"
          title={lesson.title}
          titleStyled={lesson.titleStyled}
          backgroundCode={formatLessonNumber(lessonNumber)}
          description={lesson.excerpt}
          meta={<LessonMetaRail lesson={lesson} />}
        />

        {lesson.imageUrl ? (
          <figure
            className="bg-foreground"
            data-page-reveal="media"
            style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
          >
            <Image
              src={lesson.imageUrl}
              alt={editorialImageAlt(lesson.imageAlt)}
              width={1600}
              height={900}
              sizes="100vw"
              priority
              className="mx-auto aspect-video w-full max-w-400 object-cover"
            />
          </figure>
        ) : null}

        <div
          className="bg-surface py-12 sm:py-16 lg:py-20"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": lesson.imageUrl ? "760ms" : "620ms" } as CSSProperties}
        >
          <div className={publicContentClassName}>
            <div className="mx-auto max-w-3xl space-y-10">
              <PublicRichText value={lesson.contentRich} />

              <div className="pt-4">
                <Link
                  href={`/formazione/${lesson.courseSlug}`}
                  className="inline-flex items-center gap-2 font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-3.5" aria-hidden />
                  {text.backToCourse}
                </Link>
              </div>

              <LessonNavigation
                courseSlug={lesson.courseSlug}
                previousLesson={previousLesson}
                nextLesson={nextLesson}
              />
            </div>
          </div>
        </div>

        <OtherLessonsSection courseSlug={lesson.courseSlug} otherLessons={otherLessons} />
      </article>
    </main>
  );
}
