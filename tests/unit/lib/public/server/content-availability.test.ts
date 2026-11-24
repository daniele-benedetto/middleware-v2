import { beforeEach, describe, expect, it, vi } from "vitest";

import { isPublicContentAvailable } from "@/lib/public/server/content-availability";

const { articleExists, issueExists, courseExists, lessonExists, pageExists, questionnaireExists } =
  vi.hoisted(() => ({
    articleExists: vi.fn(),
    issueExists: vi.fn(),
    courseExists: vi.fn(),
    lessonExists: vi.fn(),
    pageExists: vi.fn(),
    questionnaireExists: vi.fn(),
  }));

vi.mock("@/lib/server/modules/articles/repository/public", () => ({
  publicArticlesRepository: { existsBySlug: articleExists },
}));
vi.mock("@/lib/server/modules/issues/repository/public", () => ({
  publicIssuesRepository: { existsBySlug: issueExists },
}));
vi.mock("@/lib/server/modules/courses/repository/public", () => ({
  publicCoursesRepository: { existsBySlug: courseExists },
}));
vi.mock("@/lib/server/modules/lessons/repository/public", () => ({
  publicLessonsRepository: { existsBySlug: lessonExists },
}));
vi.mock("@/lib/server/modules/pages/repository/public", () => ({
  publicPagesRepository: { existsBySlug: pageExists },
}));
vi.mock("@/lib/server/modules/questionnaires/repository/public", () => ({
  publicQuestionnairesRepository: { existsBySlug: questionnaireExists },
}));

describe("isPublicContentAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const check of [
      articleExists,
      issueExists,
      courseExists,
      lessonExists,
      pageExists,
      questionnaireExists,
    ]) {
      check.mockResolvedValue(true);
    }
  });

  it("requires audio for listen pages", async () => {
    await isPublicContentAvailable({ kind: "article", slug: "a", listen: true });
    await isPublicContentAvailable({
      kind: "lesson",
      courseSlug: "c",
      lessonSlug: "l",
      listen: false,
    });

    expect(articleExists).toHaveBeenCalledWith("a", { withAudio: true });
    expect(lessonExists).toHaveBeenCalledWith("c", "l", { withAudio: false });
  });

  it("rejects static pages outside the public allowlist without querying", async () => {
    await expect(isPublicContentAvailable({ kind: "staticPage", slug: "manifest" })).resolves.toBe(
      false,
    );
    expect(pageExists).not.toHaveBeenCalled();

    await expect(isPublicContentAvailable({ kind: "staticPage", slug: "chi-siamo" })).resolves.toBe(
      true,
    );
    expect(pageExists).toHaveBeenCalledWith("chi-siamo");
  });

  it("reports missing content", async () => {
    issueExists.mockResolvedValue(false);

    await expect(isPublicContentAvailable({ kind: "issue", slug: "x" })).resolves.toBe(false);
  });

  it("checks courses and questionnaires by slug", async () => {
    await isPublicContentAvailable({ kind: "course", courseSlug: "corso" });
    await isPublicContentAvailable({ kind: "questionnaire", slug: "q" });

    expect(courseExists).toHaveBeenCalledWith("corso");
    expect(questionnaireExists).toHaveBeenCalledWith("q");
  });
});
