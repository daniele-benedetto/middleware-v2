import { courseVariantClasses } from "@/components/public/course-variant";
import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName, publicInteraction } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import {
  formatCourseNumber,
  getCoursePlainDescription,
} from "@/components/public/sections/formazione/course-archive-view-model";
import { formatCourseDate } from "@/components/public/sections/formazione/course-format";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

type CoursesArchiveSectionProps = {
  courses: PublicCourseDetailDto[];
  allCourses: PublicCourseDetailDto[];
};

function getArchiveGridClassName(count: number) {
  if (count === 1) return "grid";
  if (count === 2) return "grid md:grid-cols-2";
  return "grid md:grid-cols-2 xl:grid-cols-3";
}

function getArchiveCardClassName(index: number, count: number) {
  if (count === 3 && index === 2) {
    return "md:col-span-2 xl:col-span-1";
  }

  return undefined;
}

export function CoursesArchiveSection({ courses, allCourses }: CoursesArchiveSectionProps) {
  const text = i18n.public.coursePage.archive;
  const formazioneText = i18n.public.formazione;

  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="scroll-mt-20 py-12 lg:py-14">
      <div className={publicContentClassName}>
        <HomeSectionHeader
          title={text.title}
          description={text.description}
          action={{ label: text.archiveLabel, href: "/formazione" }}
        />
        <div className={getArchiveGridClassName(courses.length)}>
          {courses.map((course, index) => {
            const description = getCoursePlainDescription(course);
            const courseNumber = formatCourseNumber(
              Math.max(
                0,
                allCourses.findIndex((item) => item.id === course.id),
              ) + 1,
            );
            const variantClasses = courseVariantClasses[course.homeVariant];
            const publishedAtLabel = formatCourseDate(course.publishedAt);

            return (
              <Link
                key={course.id}
                href={`/formazione/${course.slug}`}
                className={cn(
                  publicInteraction.cardBase,
                  "relative isolate flex min-h-0 flex-col overflow-hidden px-0 py-6 max-md:border-b max-md:last:border-b-0 md:min-h-96 md:px-6 md:py-7 lg:min-h-112 lg:px-7 lg:py-8",
                  variantClasses.surface,
                  variantClasses.border,
                  variantClasses.cardBorder,
                  "max-md:border-x-0 max-md:border-t-0",
                  getArchiveCardClassName(index, courses.length),
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-4 right-4 -z-10 font-heading text-[clamp(96px,13vw,180px)] leading-[0.75] font-black tracking-tighter select-none",
                    variantClasses.backgroundNumber,
                  )}
                  aria-hidden
                >
                  {courseNumber}
                </span>

                <h3
                  className={cn(
                    "font-heading text-[clamp(30px,3.8vw,52px)] leading-[0.9] font-black tracking-[-0.048em] text-balance",
                    variantClasses.title,
                  )}
                >
                  <StyledTitle
                    title={course.title}
                    titleStyled={course.titleStyled}
                    primaryClassName={variantClasses.titlePrimary}
                  />
                </h3>

                <div className={cn("mt-6 w-full md:border-t-2 md:pt-5", variantClasses.border)}>
                  {description ? (
                    <p
                      className={cn(
                        "font-editorial text-[16px] leading-normal italic lg:text-[17px]",
                        variantClasses.description,
                      )}
                    >
                      {description}
                    </p>
                  ) : null}

                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-3 font-heading text-xs font-semibold",
                      description ? "mt-6" : "",
                      variantClasses.meta,
                    )}
                  >
                    <span>{courseNumber}</span>
                    <span
                      className={cn("size-1 rounded-[1px]", variantClasses.separator)}
                      aria-hidden
                    />
                    <span>{publishedAtLabel}</span>
                    <span
                      className={cn("size-1 rounded-[1px]", variantClasses.separator)}
                      aria-hidden
                    />
                    <span>{formazioneText.lessonsCountLabel(course.lessonsCount)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
