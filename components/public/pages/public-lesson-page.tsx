import { PlayIcon } from "lucide-react";
import Image from "next/image";

import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { PublicRichText } from "@/components/public/rich-text";
import { DossierLessonCard } from "@/components/public/sections/formazione/dossier-lesson-card";
import { i18n } from "@/lib/i18n";
import { editorialImageAlt } from "@/lib/public/format/image";

import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";
import type { CSSProperties } from "react";

type PublicLessonPageProps = {
  lesson: PublicLessonDetailDto;
  lessonNumber: number | null;
  otherLessons: PublicCourseLessonSummaryDto[];
};

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

function formatLessonNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

function getLessonTitleTypographyClassName(title: string) {
  const wordCount = title.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount >= 14) {
    return "font-heading text-[clamp(38px,6vw,88px)] leading-[0.96] font-black tracking-[-0.052em] [text-wrap:balance]";
  }

  if (wordCount >= 9) {
    return "font-heading text-[clamp(42px,7vw,108px)] leading-[0.94] font-black tracking-[-0.056em] [text-wrap:balance]";
  }

  return "font-heading text-[clamp(48px,9.5vw,138px)] leading-[0.86] font-black tracking-[-0.06em] [text-wrap:balance]";
}

function getRelatedLessonsGridClassName(count: number) {
  if (count === 1) {
    return "grid md:border-l md:border-t md:border-foreground";
  }

  if (count === 2) {
    return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground";
  }

  return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground xl:grid-cols-3";
}

function getRelatedLessonCardClassName(index: number, count: number) {
  if (count === 3 && index === 2) {
    return "md:col-span-2 xl:col-span-1";
  }

  return undefined;
}

function LessonMetaRail({ lesson }: { lesson: PublicLessonDetailDto }) {
  const text = i18n.public.lessonPage;
  const metaItems = [
    { key: "course", label: lesson.courseTitle, href: `/contro-formazione/${lesson.courseSlug}` },
    { key: "readingTime", label: text.readingTimeLabel(lesson.readingTimeMinutes) },
    { key: "date", label: formatLessonDate(lesson.publishedAt), dateTime: lesson.publishedAt },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <PublicMetaRail items={metaItems} />

      {lesson.audioUrl ? (
        <Link
          href={`/contro-formazione/${lesson.courseSlug}/${lesson.slug}/ascolta`}
          className="inline-flex w-fit shrink-0 items-center gap-2 pb-1 font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
        >
          <PlayIcon className="size-3.5 fill-current" aria-hidden />
          {text.audioCta}
        </Link>
      ) : null}
    </div>
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
          action={{ label: text.viewCourse, href: `/contro-formazione/${courseSlug}` }}
        />

        <div className={getRelatedLessonsGridClassName(otherLessons.length)}>
          {otherLessons.map((lesson, index) => (
            <DossierLessonCard
              key={lesson.id}
              courseSlug={courseSlug}
              lesson={lesson}
              number={lesson.sortOrder + 1}
              variant="constellationSecondary"
              className={getRelatedLessonCardClassName(index, otherLessons.length)}
              showImage={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicLessonPage({ lesson, lessonNumber, otherLessons }: PublicLessonPageProps) {
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
          titleTypographyClassName={getLessonTitleTypographyClassName(lesson.title)}
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
              preload
              className="mx-auto aspect-video w-full max-w-400 object-cover grayscale"
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
            </div>
          </div>
        </div>

        <OtherLessonsSection courseSlug={lesson.courseSlug} otherLessons={otherLessons} />
      </article>
    </main>
  );
}
