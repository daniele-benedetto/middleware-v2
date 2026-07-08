import { IssuesArchiveRail } from "@/components/public/sections/archive/issues-archive-rail";
import { CourseArchiveCard } from "@/components/public/sections/formazione/course-archive-card";
import { i18n } from "@/lib/i18n";

import type { CourseArchiveViewModel } from "@/components/public/sections/formazione/course-archive-view-model";
import type { CSSProperties } from "react";

type CourseArchiveGridProps = {
  courses: CourseArchiveViewModel[];
};

export function CourseArchiveGrid({ courses }: CourseArchiveGridProps) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <div data-page-reveal="body" style={{ "--page-reveal-delay": "660ms" } as CSSProperties}>
      <h2 className="sr-only">{i18n.public.formazione.railAriaLabel}</h2>
      <IssuesArchiveRail ariaLabel={i18n.public.formazione.railAriaLabel}>
        {courses.map((course) => (
          <CourseArchiveCard
            key={course.id}
            course={course}
            className="w-full lg:w-screen lg:shrink-0"
          />
        ))}
      </IssuesArchiveRail>
    </div>
  );
}
