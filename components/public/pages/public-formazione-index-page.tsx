import { PublicSystemScreen } from "@/components/public";
import { IssuesArchiveHero } from "@/components/public/sections/archive/issues-archive-hero";
import { CourseArchiveGrid } from "@/components/public/sections/formazione/course-archive-grid";
import { getCourseArchiveViewModels } from "@/components/public/sections/formazione/course-archive-view-model";
import { i18n } from "@/lib/i18n";
import { buildFormazioneArchiveJsonLd } from "@/lib/seo";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

type PublicFormazioneIndexPageProps = {
  courses: PublicCourseDetailDto[];
};

export function PublicFormazioneIndexPage({ courses }: PublicFormazioneIndexPageProps) {
  const text = i18n.public.formazione;
  const courseViewModels = getCourseArchiveViewModels(courses);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFormazioneArchiveJsonLd(courses)),
        }}
      />
      {courseViewModels.length > 0 ? (
        <>
          <IssuesArchiveHero
            title={text.hero.title}
            description={text.hero.description}
            totalLabel={text.hero.totalLabel(courseViewModels.length)}
          />
          <CourseArchiveGrid courses={courseViewModels} />
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
