import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName } from "@/components/public/primitives";
import { DossierLessonCard } from "@/components/public/sections/formazione/dossier-lesson-card";
import { i18n } from "@/lib/i18n";

import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";

function getGridClassName(count: number) {
  if (count === 1) return "grid md:border-l md:border-t md:border-foreground";
  if (count === 2) return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground";
  return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground xl:grid-cols-3";
}

function getCardClassName(index: number, count: number) {
  return count === 3 && index === 2 ? "md:col-span-2 xl:col-span-1" : undefined;
}

export function LessonRelatedSection({
  courseSlug,
  otherLessons,
}: {
  courseSlug: string;
  otherLessons: PublicCourseLessonSummaryDto[];
}) {
  if (otherLessons.length === 0) return null;

  const text = i18n.public.lessonPage;

  return (
    <section className="scroll-mt-20 bg-background py-12 lg:py-14">
      <div className={publicContentClassName}>
        <HomeSectionHeader
          title={text.otherLessonsTitle}
          action={{ label: text.viewCourse, href: `/contro-formazione/${courseSlug}` }}
        />
        <div className={getGridClassName(otherLessons.length)}>
          {otherLessons.map((lesson, index) => (
            <DossierLessonCard
              key={lesson.id}
              courseSlug={courseSlug}
              lesson={lesson}
              number={lesson.sortOrder + 1}
              variant="constellationSecondary"
              className={getCardClassName(index, otherLessons.length)}
              showImage={false}
              analyticsSource="related"
              analyticsPosition={`related_${index + 1}`}
              analyticsParentSlug={courseSlug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
