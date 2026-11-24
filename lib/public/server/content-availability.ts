import "server-only";

import { isPublicStaticPageSlug } from "@/lib/public/pages/static-pages";
import { publicArticlesRepository } from "@/lib/server/modules/articles/repository/public";
import { publicCoursesRepository } from "@/lib/server/modules/courses/repository/public";
import { publicIssuesRepository } from "@/lib/server/modules/issues/repository/public";
import { publicLessonsRepository } from "@/lib/server/modules/lessons/repository/public";
import { publicPagesRepository } from "@/lib/server/modules/pages/repository/public";
import { publicQuestionnairesRepository } from "@/lib/server/modules/questionnaires/repository/public";

import type { PublicContentRoute } from "@/lib/public/routes/public-content-route";

export async function isPublicContentAvailable(route: PublicContentRoute): Promise<boolean> {
  switch (route.kind) {
    case "article":
      return publicArticlesRepository.existsBySlug(route.slug, { withAudio: route.listen });
    case "issue":
      return publicIssuesRepository.existsBySlug(route.slug);
    case "course":
      return publicCoursesRepository.existsBySlug(route.courseSlug);
    case "lesson":
      return publicLessonsRepository.existsBySlug(route.courseSlug, route.lessonSlug, {
        withAudio: route.listen,
      });
    case "staticPage":
      return isPublicStaticPageSlug(route.slug) && publicPagesRepository.existsBySlug(route.slug);
    case "questionnaire":
      return publicQuestionnairesRepository.existsBySlug(route.slug);
  }
}
