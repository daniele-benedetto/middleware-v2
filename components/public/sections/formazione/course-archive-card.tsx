import { courseVariantClasses } from "@/components/public/course-variant";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { formatCourseDate } from "@/components/public/sections/formazione/course-format";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { CourseArchiveViewModel } from "@/components/public/sections/formazione/course-archive-view-model";

type CourseArchiveCardProps = {
  course: CourseArchiveViewModel;
  className?: string;
};

export function CourseArchiveCard({ course, className }: CourseArchiveCardProps) {
  const text = i18n.public.formazione;
  const variantClasses = courseVariantClasses[course.homeVariant];
  const publishedAtLabel = formatCourseDate(course.publishedAt);

  return (
    <TrackedPublicLink
      href={`/contro-formazione/${course.slug}`}
      analyticsEventName={publicAnalyticsEvents.contentCardClick}
      analyticsEventData={{
        content_type: "course",
        slug: course.slug,
        source: "archive",
        position: course.courseNumber,
      }}
      className={cn(
        publicInteraction.cardBase,
        "relative isolate block overflow-hidden py-7 max-lg:border-b max-lg:last:border-b-0 md:py-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center lg:py-14",
        variantClasses.surface,
        variantClasses.border,
        variantClasses.cardBorder,
        "max-lg:border-x-0 max-lg:border-t-0",
        className,
      )}
    >
      <div className={cn(publicContentClassName, "relative z-10")}>
        <span
          className={cn(
            publicTypography.issueBackgroundNumber,
            "pointer-events-none absolute -top-10 right-5 -z-10 select-none",
            variantClasses.backgroundNumber,
          )}
          aria-hidden
        >
          {course.courseNumber}
        </span>

        <h3 className={cn(publicTypography.homeHeroTitle, "w-full", variantClasses.title)}>
          <StyledTitle
            title={course.title}
            titleStyled={course.titleStyled}
            primaryClassName={variantClasses.titlePrimary}
          />
        </h3>

        <div className={cn("mt-8 w-full lg:border-t-2 lg:pt-5", variantClasses.border)}>
          {course.descriptionPlain ? (
            <p
              className={cn(
                "font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] italic",
                variantClasses.description,
              )}
            >
              {course.descriptionPlain}
            </p>
          ) : null}

          <div
            className={cn(
              "mt-6 flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold sm:text-[14px]",
              variantClasses.meta,
            )}
          >
            <span>{course.courseNumber}</span>
            <span className={cn("size-1 rounded-[1px]", variantClasses.separator)} aria-hidden />
            <span>{publishedAtLabel}</span>
            <span className={cn("size-1 rounded-[1px]", variantClasses.separator)} aria-hidden />
            <span>{text.lessonsCountLabel(course.lessonsCount)}</span>
          </div>
        </div>
      </div>
    </TrackedPublicLink>
  );
}
