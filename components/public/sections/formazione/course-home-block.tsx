import { courseVariantClasses } from "@/components/public/course-variant";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { DossierLessonCard } from "@/components/public/sections/formazione/dossier-lesson-card";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { cn } from "@/lib/utils";

import type { CourseHomeBlock as CourseHomeBlockData } from "@/components/public/home/home-view-model";

export function CourseHomeBlock({
  block,
  startNumber,
}: {
  block: CourseHomeBlockData;
  startNumber: number;
}) {
  const { course } = block;
  const variant = courseVariantClasses[course.homeVariant];
  const description = extractPlainText(course.description);
  const lessonsGridClass =
    course.lessons.length === 1
      ? "grid-cols-1"
      : course.lessons.length === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <TrackedPublicLink
          href={`/contro-formazione/${course.slug}`}
          analyticsEventName={publicAnalyticsEvents.contentCardClick}
          analyticsEventData={{
            content_type: "course",
            slug: course.slug,
            source: "issue_course",
            position: "course",
          }}
          className={cn(publicInteraction.cardBase, variant.surface, "block p-6 md:p-8 lg:p-10")}
        >
          <div>
            <h2 className={cn(publicTypography.featureArticleTitle, variant.title, "max-w-[16ch]")}>
              <StyledTitle
                title={course.title}
                titleStyled={course.titleStyled}
                primaryClassName={variant.titlePrimary}
              />
            </h2>
            {description ? (
              <p
                className={cn(
                  "mt-5 w-full",
                  publicTypography.dossierDescription,
                  variant.description,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </TrackedPublicLink>
        {course.lessons.length > 0 ? (
          <div className="px-4 sm:px-6 md:px-0">
            <div
              className={cn("grid md:border-l md:border-t md:border-foreground", lessonsGridClass)}
            >
              {course.lessons.map((lesson, index) => (
                <DossierLessonCard
                  key={lesson.id}
                  courseSlug={course.slug}
                  lesson={lesson}
                  number={startNumber + index}
                  variant="constellationSecondary"
                  analyticsSource="issue_course"
                  analyticsParentSlug={course.slug}
                  className={index === course.lessons.length - 1 ? "max-md:pb-0" : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
