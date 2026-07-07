import { PlayIcon } from "lucide-react";

import { PublicPageHero } from "@/components/public/compounds";
import { courseVariantClasses } from "@/components/public/course-variant";
import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName, publicInteraction } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type {
  PublicCourseDetailDto,
  PublicCourseLessonSummaryDto,
} from "@/lib/server/modules/courses/dto/public";

type PublicCoursePageProps = {
  course: PublicCourseDetailDto;
  description?: string;
};

function formatLessonNumber(value: number) {
  return String(value).padStart(2, "0");
}

function LessonRow({
  courseSlug,
  lesson,
  number,
}: {
  courseSlug: string;
  lesson: PublicCourseLessonSummaryDto;
  number: number;
}) {
  const text = i18n.public.coursePage;

  return (
    <Link
      href={`/formazione/${courseSlug}/${lesson.slug}`}
      className={cn(
        publicInteraction.cardSurface,
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 border-r border-b border-foreground bg-background px-5 py-6 sm:gap-6 sm:px-6 sm:py-7 md:px-7",
      )}
    >
      <span className="shrink-0 font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] text-accent sm:text-[48px]">
        {formatLessonNumber(number)}
      </span>

      <div className="flex min-w-0 flex-col">
        <h3 className="font-heading text-[23px] leading-[1.05] font-black tracking-[-0.032em] text-foreground sm:text-[24px] md:text-[28px]">
          <StyledTitle title={lesson.title} titleStyled={lesson.titleStyled} />
        </h3>

        {lesson.excerpt ? (
          <p className="mt-4 font-editorial text-[16px] leading-normal text-body-text md:text-[17px]">
            {lesson.excerpt}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3 font-heading text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          <span>{text.readingTimeLabel(lesson.readingTimeMinutes)}</span>
          {lesson.hasAudio ? (
            <span className="inline-flex items-center gap-1.5 text-accent">
              <PlayIcon className="size-3 fill-current" aria-hidden />
              {text.audioLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function PublicCoursePage({ course, description }: PublicCoursePageProps) {
  const text = i18n.public.coursePage;
  const variant = courseVariantClasses[course.homeVariant];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article>
        <PublicPageHero
          as="header"
          title={course.title}
          titleStyled={course.titleStyled}
          description={description}
          surfaceClassName={variant.surface}
          titleClassName={variant.title}
          titlePrimaryClassName={variant.titlePrimary}
          descriptionClassName={variant.description}
          meta={
            <p
              className={cn("font-heading text-[13px] font-semibold sm:text-[14px]", variant.meta)}
            >
              {text.lessonsCountLabel(course.lessonsCount)}
            </p>
          }
        />

        <section className="bg-background py-12 lg:py-14">
          <div className={publicContentClassName}>
            <HomeSectionHeader title={text.lessonsHeading} />

            {course.lessons.length > 0 ? (
              <div className="grid border-l border-t border-foreground">
                {course.lessons.map((lesson, index) => (
                  <LessonRow
                    key={lesson.id}
                    courseSlug={course.slug}
                    lesson={lesson}
                    number={index + 1}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </article>
    </main>
  );
}
