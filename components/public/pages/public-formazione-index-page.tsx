import { PublicSystemScreen } from "@/components/public";
import { PublicPageHero } from "@/components/public/compounds";
import { courseVariantClasses } from "@/components/public/course-variant";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

type PublicFormazioneIndexPageProps = {
  courses: PublicCourseDetailDto[];
};

function formatCourseNumber(value: number) {
  return String(value).padStart(2, "0");
}

function getCoursesGridClassName(count: number) {
  if (count === 1) {
    return "grid border-l border-t border-foreground";
  }

  if (count === 2) {
    return "grid border-l border-t border-foreground md:grid-cols-2";
  }

  return "grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3";
}

function CourseCard({ course, number }: { course: PublicCourseDetailDto; number: number }) {
  const text = i18n.public.formazione;
  const variant = courseVariantClasses[course.homeVariant];

  return (
    <Link
      href={`/formazione/${course.slug}`}
      className={cn(
        publicInteraction.cardSurface,
        "relative flex h-full flex-col overflow-hidden border-r border-b border-foreground px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7",
        variant.surface,
      )}
    >
      <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <span
          className={cn(
            "shrink-0 font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] sm:text-[48px]",
            variant.titlePrimary,
          )}
        >
          {formatCourseNumber(number)}
        </span>
        <span className={cn(publicTypography.articleEyebrow, "min-w-0", variant.meta)}>
          {text.lessonsCountLabel(course.lessonsCount)}
        </span>
      </div>

      <h3
        className={cn(
          "font-heading text-[23px] leading-[1.05] font-black tracking-[-0.032em] sm:text-[24px] md:text-[28px]",
          variant.title,
        )}
      >
        <StyledTitle
          title={course.title}
          titleStyled={course.titleStyled}
          primaryClassName={variant.titlePrimary}
        />
      </h3>
    </Link>
  );
}

export function PublicFormazioneIndexPage({ courses }: PublicFormazioneIndexPageProps) {
  const text = i18n.public.formazione;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      {courses.length > 0 ? (
        <>
          <PublicPageHero
            as="header"
            title={text.hero.title}
            description={text.hero.description}
            meta={
              <p className="font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
                {text.hero.totalLabel(courses.length)}
              </p>
            }
          />

          <section className="bg-background py-12 lg:py-14">
            <div className={publicContentClassName}>
              <div className={getCoursesGridClassName(courses.length)}>
                {courses.map((course, index) => (
                  <CourseCard key={course.id} course={course} number={index + 1} />
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <PublicSystemScreen
          code={text.empty.code}
          kicker={text.empty.kicker}
          title={text.empty.title}
          description={text.empty.description}
        />
      )}
    </main>
  );
}
