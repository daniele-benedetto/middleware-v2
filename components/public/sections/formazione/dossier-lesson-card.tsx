import Image from "next/image";

import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { formatLessonNumber } from "@/components/public/sections/formazione/course-format";
import { LessonMeta } from "@/components/public/sections/formazione/lesson-meta";
import { StyledTitle } from "@/components/public/styled-title";
import { editorialImageAlt } from "@/lib/public/format/image";
import { cn } from "@/lib/utils";

import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";

type DossierLessonCardProps = {
  courseSlug: string;
  lesson: PublicCourseLessonSummaryDto;
  number: number;
  variant: "clusterFeatured" | "constellationSecondary";
  className?: string;
  showImage?: boolean;
};

export function DossierLessonCard({
  courseSlug,
  lesson,
  number,
  variant,
  className = "",
  showImage = true,
}: DossierLessonCardProps) {
  const lessonHref = `/formazione/${courseSlug}/${lesson.slug}`;
  const titleId = `lesson-card-title-${lesson.id}`;
  const isClusterFeatured = variant === "clusterFeatured";
  const image =
    showImage && lesson.imageUrl ? (
      <div className="mt-5 overflow-hidden border border-foreground grayscale">
        <Image
          src={lesson.imageUrl}
          alt={editorialImageAlt(lesson.imageAlt)}
          width={1200}
          height={800}
          sizes="(min-width: 768px) 38vw, 100vw"
          className={cn("h-auto w-full object-cover", publicInteraction.imageZoom)}
        />
      </div>
    ) : null;

  return (
    <Link
      href={lessonHref}
      aria-labelledby={titleId}
      className={cn(
        publicInteraction.cardSurface,
        "flex h-full overflow-hidden border-foreground bg-background",
        "flex-col border-r border-b px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7",
        className,
      )}
    >
      <article className="contents">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
            <span
              className={`shrink-0 font-heading leading-[0.78] font-black tracking-[-0.04em] text-accent ${
                isClusterFeatured
                  ? "text-[40px] sm:text-[48px] md:text-[56px]"
                  : "text-[40px] sm:text-[48px]"
              }`}
            >
              {formatLessonNumber(number)}
            </span>
            <span className={cn(publicTypography.articleEyebrow, "min-w-0 text-muted")}>
              Lezione
            </span>
          </div>

          <h3
            id={titleId}
            className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
              isClusterFeatured
                ? "text-[25px] sm:text-[27px] md:text-[32px]"
                : "text-[23px] sm:text-[24px] md:text-[28px]"
            }`}
          >
            <StyledTitle title={lesson.title} titleStyled={lesson.titleStyled} />
          </h3>
          {image}
          {lesson.excerpt ? (
            <p
              className={`mt-4 font-editorial leading-normal text-body-text ${
                isClusterFeatured ? "text-[17px] md:text-[18px]" : "text-[16px] md:text-[17px]"
              }`}
            >
              {lesson.excerpt}
            </p>
          ) : null}
          <div className="mt-auto pt-6">
            <LessonMeta lesson={lesson} />
          </div>
        </div>
      </article>
    </Link>
  );
}
