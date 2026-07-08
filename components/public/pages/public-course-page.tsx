import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { getCourseNumberLabel } from "@/components/public/sections/formazione/course-archive-view-model";
import { CourseDossier } from "@/components/public/sections/formazione/course-dossier";
import { formatCourseDate } from "@/components/public/sections/formazione/course-format";
import { CoursesArchiveSection } from "@/components/public/sections/formazione/courses-archive-section";
import { i18n } from "@/lib/i18n";
import { buildCoursePageJsonLd } from "@/lib/seo";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

type PublicCoursePageProps = {
  course: PublicCourseDetailDto;
  publishedCourses: PublicCourseDetailDto[];
  description?: string;
};

function CourseMetaRail({
  course,
  courseNumber,
}: {
  course: PublicCourseDetailDto;
  courseNumber: string;
}) {
  const text = i18n.public.coursePage;
  const metaItems = [
    { key: "course", label: courseNumber },
    { key: "date", label: formatCourseDate(course.publishedAt), dateTime: course.publishedAt },
    { key: "count", label: text.lessonsCountLabel(course.lessonsCount) },
  ];

  return <PublicMetaRail items={metaItems} />;
}

export function PublicCoursePage({ course, publishedCourses, description }: PublicCoursePageProps) {
  const courseNumber = getCourseNumberLabel(publishedCourses, course.id);
  const archiveCourses = publishedCourses.filter((item) => item.id !== course.id).slice(0, 3);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildCoursePageJsonLd(course)),
        }}
      />
      <article>
        <PublicPageHero
          as="header"
          title={course.title}
          titleStyled={course.titleStyled}
          backgroundCode={courseNumber}
          description={description}
          meta={<CourseMetaRail course={course} courseNumber={courseNumber} />}
          containerClassName="py-7 sm:py-9 lg:py-14"
        />
        <CourseDossier course={course} />
        <CoursesArchiveSection courses={archiveCourses} allCourses={publishedCourses} />
      </article>
    </main>
  );
}
