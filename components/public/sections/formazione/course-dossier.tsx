import Image from "next/image";

import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { formatLessonNumber } from "@/components/public/sections/formazione/course-format";
import { DossierLessonCard } from "@/components/public/sections/formazione/dossier-lesson-card";
import { LessonMeta } from "@/components/public/sections/formazione/lesson-meta";
import { StyledTitle } from "@/components/public/styled-title";
import { editorialImageAlt } from "@/lib/public/format/image";
import { cn } from "@/lib/utils";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";
import type { CourseHomeVariant } from "@/lib/server/modules/courses/schema";
import type { CSSProperties } from "react";

type CourseDossierProps = {
  course: PublicCourseDetailDto;
};

function getNarrativeVariantClasses(variant: CourseHomeVariant) {
  switch (variant) {
    case "red":
      return {
        section: "bg-accent text-background",
        eyebrow: "text-cream-muted",
        metaTone: "accent" as const,
        titlePrimary: "text-foreground",
        excerpt: "text-cream-soft",
        description: "text-cream-muted",
        image: "border-cream-border-muted grayscale",
      };
    case "default":
      return {
        section: "border-y border-foreground bg-background text-foreground",
        eyebrow: "text-muted",
        metaTone: "light" as const,
        titlePrimary: "text-accent",
        excerpt: "text-body-text",
        description: "text-muted",
        image: "border-foreground grayscale",
      };
    case "black":
      return {
        section: "bg-foreground text-background",
        eyebrow: "text-dark-muted",
        metaTone: "dark" as const,
        titlePrimary: "text-accent",
        excerpt: "text-cream-warm",
        description: "text-dark-muted",
        image: "border-dark-border grayscale",
      };
    default: {
      const exhaustiveCheck: never = variant;
      throw new Error(`Unhandled course variant: ${String(exhaustiveCheck)}`);
    }
  }
}

function LeadLesson({ course }: CourseDossierProps) {
  const lesson = course.lessons[0];

  if (!lesson) {
    return null;
  }

  const variantClasses = getNarrativeVariantClasses(course.homeVariant);
  const lessonHref = `/formazione/${course.slug}/${lesson.slug}`;
  const titleId = `lead-lesson-title-${lesson.id}`;

  return (
    <section className={`mb-10 scroll-mt-20 lg:mb-12 ${variantClasses.section}`}>
      <div className={`${publicContentClassName} py-10 md:py-12`}>
        <Link
          href={lessonHref}
          aria-labelledby={titleId}
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "660ms" } as CSSProperties}
          className={cn(
            publicInteraction.cardBase,
            "grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12",
          )}
        >
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <span className={cn(publicTypography.articleNumberLg, variantClasses.titlePrimary)}>
                {formatLessonNumber(1)}
              </span>
              <p className={cn(publicTypography.articleEyebrowWide, variantClasses.eyebrow)}>
                Lezione di apertura
              </p>
            </div>
            <h2
              id={titleId}
              className={cn(publicTypography.leadArticleTitle, "max-w-[13ch] text-balance")}
            >
              <StyledTitle
                title={lesson.title}
                titleStyled={lesson.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            {lesson.excerpt ? (
              <p
                className={`mt-6 max-w-[58ch] font-editorial text-[clamp(19px,1.6vw,24px)] leading-[1.36] italic ${variantClasses.excerpt}`}
              >
                {lesson.excerpt}
              </p>
            ) : null}
            <div className="mt-7">
              <LessonMeta lesson={lesson} tone={variantClasses.metaTone} />
            </div>
          </div>

          {lesson.imageUrl ? (
            <div
              className={`relative min-h-76 overflow-hidden border sm:min-h-82 md:min-h-full lg:min-h-120 ${variantClasses.image}`}
            >
              <Image
                src={lesson.imageUrl}
                alt={editorialImageAlt(lesson.imageAlt)}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className={cn("object-cover", publicInteraction.imageZoom)}
                priority
              />
            </div>
          ) : null}
        </Link>
      </div>
    </section>
  );
}

function LessonGrid({ course }: CourseDossierProps) {
  const lessons = course.lessons.slice(1);

  if (lessons.length === 0) {
    return null;
  }

  return (
    <section className="scroll-mt-20 py-10 lg:py-12">
      <div className={publicContentClassName}>
        <h2 className="sr-only">Lezioni del corso</h2>
        <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson, index) => (
            <DossierLessonCard
              key={lesson.id}
              courseSlug={course.slug}
              lesson={lesson}
              number={index + 2}
              variant="constellationSecondary"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CourseDossier({ course }: CourseDossierProps) {
  if (course.lessons.length === 0) {
    return null;
  }

  return (
    <div className="bg-background">
      <LeadLesson course={course} />
      <LessonGrid course={course} />
    </div>
  );
}
