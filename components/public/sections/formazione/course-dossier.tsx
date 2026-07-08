import { publicContentClassName } from "@/components/public/primitives";
import { DossierLessonCard } from "@/components/public/sections/formazione/dossier-lesson-card";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";
import type { CSSProperties } from "react";

type CourseDossierProps = {
  course: PublicCourseDetailDto;
};

export function CourseDossier({ course }: CourseDossierProps) {
  if (course.lessons.length === 0) {
    return null;
  }

  return (
    <div data-page-reveal="body" style={{ "--page-reveal-delay": "660ms" } as CSSProperties}>
      <section className="scroll-mt-20 py-10 lg:py-12">
        <div className={publicContentClassName}>
          <h2 className="sr-only">Incontri</h2>
          <div className="grid md:grid-cols-2 md:border-l md:border-t md:border-foreground xl:grid-cols-3">
            {course.lessons.map((lesson, index) => (
              <DossierLessonCard
                key={lesson.id}
                courseSlug={course.slug}
                lesson={lesson}
                number={index + 1}
                variant="constellationSecondary"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
